import io
import json
import logging
import re
from typing import Any, Dict, List, Optional, Tuple
from PIL import Image, ImageFilter, ImageOps, ImageStat
from app.core.config import settings

logger = logging.getLogger(__name__)


def _prepare_rgb(image_bytes: bytes) -> Image.Image:
    """Decode raw bytes, apply EXIF orientation, and convert safely to RGB."""
    img = Image.open(io.BytesIO(image_bytes))
    try:
        img = ImageOps.exif_transpose(img)
    except Exception:
        pass
    if img.mode in ("RGBA", "LA", "P"):
        canvas = Image.new("RGB", img.size, (255, 255, 255))
        if img.mode == "P":
            img = img.convert("RGBA")
        if "A" in img.mode:
            canvas.paste(img, mask=img.split()[-1])
        else:
            canvas.paste(img)
        return canvas
    if img.mode != "RGB":
        return img.convert("RGB")
    return img


def compute_cv_image_analysis(image_bytes: bytes, description: str = "") -> Dict[str, Any]:
    """
    Deterministic computer-vision pixel inspection using Pillow spatial patches,
    Laplacian edge sharpness, luminance statistics, and dark-cavity/crack density analysis.
    """
    try:
        rgb = _prepare_rgb(image_bytes)
    except Exception as exc:
        logger.warning("CV image decode fallback: %s", exc)
        return {
            "category": "surface_damage",
            "visible_severity": "medium",
            "image_quality": "adequate",
            "visual_evidence": "Unable to inspect pixel structure; queued for manual review.",
            "uncertainties": [f"Image decode warning: {str(exc)[:60]}"],
            "needs_human_review": True,
            "confidence_score": 0.4,
            "detected_regions": [],
            "vision_metrics": {},
            "is_fallback": True,
            "analysis_source": "cv_fallback",
            "model_name": "CivicPulse-Vision-CV-1.0",
            "model_version": "1.0.0",
        }

    orig_w, orig_h = rgb.size
    analysis_w, analysis_h = 256, 192
    work = rgb.resize((analysis_w, analysis_h), Image.Resampling.BILINEAR)
    gray = work.convert("L")

    # 1. Image quality: Sharpness (Laplacian edge energy) and Exposure
    laplacian_kernel = ImageFilter.Kernel(
        size=(3, 3),
        kernel=[-1, -1, -1, -1, 8, -1, -1, -1, -1],
        scale=1,
        offset=0,
    )
    lap = gray.filter(laplacian_kernel)
    lap_stat = ImageStat.Stat(lap)
    gray_stat = ImageStat.Stat(gray)

    sharpness_var = round(float(lap_stat.var[0]), 2)
    mean_luma = round(float(gray_stat.mean[0]), 2)
    std_luma = round(float(gray_stat.stddev[0]), 2)

    edges = gray.filter(ImageFilter.FIND_EDGES)
    edge_stat = ImageStat.Stat(edges)
    mean_edge = round(float(edge_stat.mean[0]), 2)

    quality_issues: List[str] = []
    if orig_w < 400 or orig_h < 300:
        image_quality = "low_resolution"
        quality_issues.append(f"Low resolution ({orig_w}x{orig_h}px)")
    elif mean_luma < 42.0:
        image_quality = "poor_lighting"
        quality_issues.append("Underexposed / dark scene limits depth estimation")
    elif mean_luma > 225.0:
        image_quality = "poor_lighting"
        quality_issues.append("Overexposed highlights may obscure surface contrast")
    elif sharpness_var < 95.0:
        image_quality = "blurry"
        quality_issues.append("Low spatial edge variance indicates motion blur or soft focus")
    elif sharpness_var >= 220.0 and orig_w >= 600:
        image_quality = "good"
    else:
        image_quality = "adequate"

    # 2. Asphalt saturation & road tone distribution check
    hsv = work.convert("HSV")
    sat_stat = ImageStat.Stat(hsv.split()[1])
    mean_saturation = float(sat_stat.mean[0])  # low saturation => concrete/asphalt grey tones
    asphalt_likelihood = round(max(0.0, min(1.0, 1.0 - (mean_saturation / 160.0))), 2)

    # 3. 12x9 Grid Patch Feature Extraction (cavity darkness, texture variance, edge density)
    cols, rows = 12, 9
    pw, ph = analysis_w // cols, analysis_h // rows

    patch_lumas: List[List[float]] = []
    patch_edges: List[List[float]] = []
    patch_stds: List[List[float]] = []
    patch_sats: List[List[float]] = []
    all_lumas: List[float] = []

    sat_band = hsv.split()[1]
    for r in range(rows):
        row_l, row_e, row_s, row_sat = [], [], [], []
        for c in range(cols):
            box = (c * pw, r * ph, (c + 1) * pw, (r + 1) * ph)
            g_crop = gray.crop(box)
            e_crop = edges.crop(box)
            s_crop = sat_band.crop(box)
            gs = ImageStat.Stat(g_crop)
            es = ImageStat.Stat(e_crop)
            ss = ImageStat.Stat(s_crop)
            l_val = float(gs.mean[0])
            row_l.append(l_val)
            row_s.append(float(gs.stddev[0]))
            row_e.append(float(es.mean[0]))
            row_sat.append(float(ss.mean[0]))
            all_lumas.append(l_val)
        patch_lumas.append(row_l)
        patch_edges.append(row_e)
        patch_stds.append(row_s)
        patch_sats.append(row_sat)

    sorted_l = sorted(all_lumas)
    median_luma = sorted_l[len(sorted_l) // 2]

    dark_cavity_patches: List[Tuple[int, int, float]] = []
    crack_patches: List[Tuple[int, int, float]] = []
    rough_patches: List[Tuple[int, int, float]] = []

    for r in range(rows):
        for c in range(cols):
            l_val = patch_lumas[r][c]
            e_val = patch_edges[r][c]
            s_val = patch_stds[r][c]
            sat_val = patch_sats[r][c]

            # Ignore bright yellow/white painted lane markings when flagging defect roughness
            is_road_paint = l_val > max(125.0, median_luma * 1.35) or sat_val > 70.0

            darkness_drop = (median_luma - l_val) / max(median_luma, 1.0)
            if darkness_drop >= 0.24 and l_val < 78.0:
                score = min(0.95, 0.58 + darkness_drop * 0.75 + (e_val / 100.0) * 0.18)
                dark_cavity_patches.append((r, c, round(score, 2)))
            elif not is_road_paint and e_val >= max(22.0, mean_edge * 1.45) and darkness_drop < 0.24:
                score = min(0.90, 0.48 + (e_val / 90.0) * 0.38)
                crack_patches.append((r, c, round(score, 2)))
            elif not is_road_paint and s_val >= max(24.0, std_luma * 1.35):
                score = min(0.85, 0.45 + (s_val / 70.0) * 0.35)
                rough_patches.append((r, c, round(score, 2)))

    def _merge_patches_to_boxes(
        patches: List[Tuple[int, int, float]], label: str, max_boxes: int = 3
    ) -> List[Dict[str, Any]]:
        if not patches:
            return []
        patch_map = {(r, c): s for r, c, s in patches}
        visited = set()
        regions = []

        for r, c, _ in patches:
            if (r, c) in visited:
                continue
            stack = [(r, c)]
            comp = []
            while stack:
                cr, cc = stack.pop()
                if (cr, cc) in visited or (cr, cc) not in patch_map:
                    continue
                visited.add((cr, cc))
                comp.append((cr, cc, patch_map[(cr, cc)]))
                for dr, dc in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                    nr, nc = cr + dr, cc + dc
                    if (nr, nc) in patch_map and (nr, nc) not in visited:
                        stack.append((nr, nc))

            min_r = min(x[0] for x in comp)
            max_r = max(x[0] for x in comp)
            min_c = min(x[1] for x in comp)
            max_c = max(x[1] for x in comp)
            avg_score = round(sum(x[2] for x in comp) / len(comp), 2)
            regions.append({
                "label": label,
                "confidence": avg_score,
                "patch_count": len(comp),
                "bbox": [
                    round(min_c / cols, 3),
                    round(min_r / rows, 3),
                    round((max_c - min_c + 1) / cols, 3),
                    round((max_r - min_r + 1) / rows, 3),
                ],
            })
        regions.sort(key=lambda item: (item["patch_count"], item["confidence"]), reverse=True)
        return regions[:max_boxes]

    cavity_regions = _merge_patches_to_boxes(dark_cavity_patches, "dark_cavity_candidate")
    crack_regions = _merge_patches_to_boxes(crack_patches, "linear_edge_crack_candidate")
    rough_regions = _merge_patches_to_boxes(rough_patches, "surface_roughness_patch")

    detected_regions = (cavity_regions + crack_regions + rough_regions)[:4]

    total_patches = cols * rows
    cavity_pct = round((len(dark_cavity_patches) / total_patches) * 100.0, 1)
    crack_pct = round((len(crack_patches) / total_patches) * 100.0, 1)
    rough_pct = round((len(rough_patches) / total_patches) * 100.0, 1)

    # 4. Classify defect category & visible severity combining pixel evidence + text context
    text = (description or "").lower()
    if any(k in text for k in ["manhole", "drain", "chamber", "cover"]):
        category = "manhole_depression"
    elif cavity_pct >= 4.0 or (len(cavity_regions) > 0 and "crack" not in text):
        category = "pothole"
    elif crack_pct >= 8.0 or any(k in text for k in ["crack", "fissure", "alligator"]):
        category = "road_crack"
    elif "pothole" in text or "pit" in text or "crater" in text:
        category = "pothole"
    else:
        category = "surface_damage"

    defect_area_pct = round(min(100.0, cavity_pct + crack_pct * 0.6 + rough_pct * 0.5), 1)
    if cavity_pct >= 12.0 or defect_area_pct >= 28.0 or any(
        w in text for w in ["deep", "large", "huge", "dangerous", "severe", "accident", "emergency", "12cm", "10cm"]
    ):
        visible_severity = "high"
    elif cavity_pct >= 4.0 or crack_pct >= 10.0 or defect_area_pct >= 12.0:
        visible_severity = "medium"
    elif any(w in text for w in ["minor", "small", "shallow", "hairline"]):
        visible_severity = "low"
    else:
        visible_severity = "medium" if detected_regions else "low"

    # Calibrated detection score
    base_conf = 0.48
    if detected_regions:
        base_conf += min(0.28, len(detected_regions) * 0.08 + (defect_area_pct / 100.0) * 0.25)
    if asphalt_likelihood >= 0.5:
        base_conf += 0.08
    if image_quality in ("blurry", "poor_lighting", "low_resolution"):
        base_conf -= 0.14
    confidence_score = round(max(0.30, min(0.91, base_conf)), 2)

    uncertainties = list(quality_issues)
    if asphalt_likelihood < 0.35:
        uncertainties.append("Scene has strong non-asphalt color saturation; verify road pavement context.")
    if not detected_regions:
        uncertainties.append("No distinct high-contrast cavity or crack region exceeded pixel thresholds.")
    uncertainties.append(
        "Patch-level CV saliency analyzer provides candidate regions; physical depth requires field measurement."
    )

    evidence_summary = (
        f"CV pixel inspection ({orig_w}x{orig_h}px, sharpness={sharpness_var}, luma={mean_luma}): "
        f"identified {len(detected_regions)} candidate region(s) covering ~{defect_area_pct}% of frame "
        f"(cavity={cavity_pct}%, high-edge={crack_pct}%, rough={rough_pct}%)."
    )

    return {
        "category": category,
        "visible_severity": visible_severity,
        "image_quality": image_quality,
        "visual_evidence": evidence_summary,
        "uncertainties": uncertainties,
        "needs_human_review": True,
        "confidence_score": confidence_score,
        "detected_regions": detected_regions,
        "vision_metrics": {
            "resolution": f"{orig_w}x{orig_h}",
            "sharpness_variance": sharpness_var,
            "mean_luminance": mean_luma,
            "mean_edge_density": mean_edge,
            "asphalt_likelihood": asphalt_likelihood,
            "cavity_area_pct": cavity_pct,
            "crack_edge_area_pct": crack_pct,
            "rough_area_pct": rough_pct,
            "defect_area_pct": defect_area_pct,
        },
        "is_fallback": False,
        "analysis_source": "vision_cv_patch_analyzer",
        "model_name": "CivicPulse-Vision-CV-1.0",
        "model_version": "1.0.0",
    }


async def _call_external_detector(image_bytes: bytes) -> Optional[Dict[str, Any]]:
    """Optional external pretrained road-damage detector endpoint (YOLO / Roboflow / HF)."""
    url = (settings.ROAD_DAMAGE_DETECTOR_URL or "").strip()
    if not url:
        return None
    try:
        import httpx

        headers = {}
        if settings.ROAD_DAMAGE_DETECTOR_TOKEN:
            headers["Authorization"] = f"Bearer {settings.ROAD_DAMAGE_DETECTOR_TOKEN}"
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.post(
                url,
                files={"file": ("road.jpg", image_bytes, "image/jpeg")},
                headers=headers,
            )
            if resp.status_code == 200:
                return resp.json()
    except Exception as exc:
        logger.warning("External road-damage detector unavailable: %s", exc)
    return None


async def analyze_defect_image(
    image_bytes: bytes, description: Optional[str] = None, image_dims: tuple = (800, 600)
) -> Dict[str, Any]:
    """
    Multi-stage road defect analysis:
    1. Always runs deterministic CV pixel & region analysis (image quality, sharpness, candidate patches).
    2. Optionally queries a configured pretrained road-damage object detector endpoint.
    3. Optionally uses Gemini multimodal vision for semantic defect interpretation (clearly separated from object detection).
    """
    cv_result = compute_cv_image_analysis(image_bytes, description or "")

    # Optional Stage 2: External pretrained road damage object detector
    ext_result = await _call_external_detector(image_bytes)
    if ext_result and isinstance(ext_result.get("detections"), list) and ext_result["detections"]:
        cv_result["detected_regions"] = ext_result["detections"][:5]
        cv_result["analysis_source"] = "external_pretrained_detector + cv_quality"
        cv_result["model_name"] = ext_result.get("model_name", "External-RoadDamage-Detector")
        cv_result["model_version"] = ext_result.get("model_version", "1.0.0")

    # Optional Stage 3: Gemini multimodal semantic interpretation
    if settings.GEMINI_API_KEY and settings.GEMINI_API_KEY.strip():
        try:
            from google import genai
            from google.genai import types

            client = genai.Client(api_key=settings.GEMINI_API_KEY)
            prompt = f"""
You are a municipal road infrastructure visual analyst supporting human engineers in Bengaluru, India.
A deterministic computer vision check produced these pixel metrics: {json.dumps(cv_result['vision_metrics'])}.
Contributor notes: "{description or 'None provided'}".

Return ONLY a valid JSON object (no markdown fences) with this exact schema:
{{
  "category": "pothole" | "road_crack" | "surface_damage" | "manhole_depression" | "other",
  "visible_severity": "high" | "medium" | "low",
  "image_quality": "good" | "adequate" | "poor_lighting" | "blurry" | "low_resolution",
  "visual_evidence": "Factual visual interpretation of road defects visible in the photograph without claiming unobservable dimensions.",
  "uncertainties": ["specific visual ambiguities such as water pooling, shadows, glare, or occlusion"],
  "needs_human_review": true,
  "confidence_score": 0.0
}}
"""
            response = client.models.generate_content(
                model=settings.GEMINI_MODEL,
                contents=[
                    types.Part.from_bytes(data=image_bytes, mime_type="image/jpeg"),
                    prompt,
                ],
            )
            response_text = response.text.strip()
            if response_text.startswith("```"):
                response_text = re.sub(r"^```(?:json)?\s*", "", response_text)
                response_text = re.sub(r"\s*```$", "", response_text)
            parsed = json.loads(response_text)

            # Merge semantic interpretation with pixel CV metrics & bounding boxes
            cv_result["category"] = parsed.get("category", cv_result["category"])
            cv_result["visible_severity"] = parsed.get("visible_severity", cv_result["visible_severity"])
            cv_result["image_quality"] = parsed.get("image_quality", cv_result["image_quality"])
            cv_result["visual_evidence"] = parsed.get("visual_evidence", cv_result["visual_evidence"])
            merged_uncertainties = list(dict.fromkeys(
                (parsed.get("uncertainties") or []) + cv_result["uncertainties"]
            ))
            cv_result["uncertainties"] = merged_uncertainties[:5]
            cv_result["confidence_score"] = round(float(parsed.get("confidence_score", cv_result["confidence_score"])), 2)
            cv_result["needs_human_review"] = True
            cv_result["is_fallback"] = False
            cv_result["analysis_source"] = "gemini_interpretation + cv_regions"
            cv_result["model_name"] = f"{settings.GEMINI_MODEL} + CV-1.0"
            cv_result["model_version"] = "multimodal-hybrid"
        except Exception as exc:
            logger.warning("Gemini interpretation failed (%s); preserving CV pixel analysis.", exc)
            cv_result["uncertainties"].append("Multimodal LLM unavailable; showing local CV pixel analysis.")

    return cv_result
