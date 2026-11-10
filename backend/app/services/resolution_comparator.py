import io
from typing import Any, Dict, Optional
from PIL import Image
from app.services.geoproof import compute_dhash, hamming_distance
from app.services.image_analysis import compute_cv_image_analysis


def compare_before_after_repair(
    before_bytes: Optional[bytes],
    after_bytes: bytes,
) -> Dict[str, Any]:
    """
    Compare an initial defect photograph against a post-repair photograph using
    perceptual hashing (scene framing similarity) and CV patch defect-reduction metrics.
    Always requires authorized human confirmation before resolution approval.
    """
    after_cv = compute_cv_image_analysis(after_bytes, "after repair surface check")
    after_metrics = after_cv.get("vision_metrics", {})

    if not before_bytes:
        return {
            "compared": False,
            "scene_similarity_pct": None,
            "visual_change_score": 0.0,
            "before_defect_area_pct": None,
            "after_defect_area_pct": after_metrics.get("defect_area_pct", 0.0),
            "before_cavity_pct": None,
            "after_cavity_pct": after_metrics.get("cavity_area_pct", 0.0),
            "defect_reduction_assessment": "baseline_unavailable",
            "scene_consistency_note": "Original defect image bytes unavailable on local partition for pixel comparison.",
            "summary": "After-repair photo analyzed standalone. Human visual verification required.",
            "requires_human_approval": True,
        }

    before_cv = compute_cv_image_analysis(before_bytes, "initial defect baseline")
    before_metrics = before_cv.get("vision_metrics", {})

    # Perceptual dHash scene similarity
    with Image.open(io.BytesIO(before_bytes)) as b_img, Image.open(io.BytesIO(after_bytes)) as a_img:
        b_hash = compute_dhash(b_img.convert("RGB"))
        a_hash = compute_dhash(a_img.convert("RGB"))
    h_dist = hamming_distance(b_hash, a_hash)
    scene_similarity_pct = round(max(0.0, (1.0 - (h_dist / 64.0)) * 100.0), 1)

    b_defect = float(before_metrics.get("defect_area_pct", 0.0))
    a_defect = float(after_metrics.get("defect_area_pct", 0.0))
    b_cavity = float(before_metrics.get("cavity_area_pct", 0.0))
    a_cavity = float(after_metrics.get("cavity_area_pct", 0.0))
    b_edge = float(before_metrics.get("mean_edge_density", 0.0))
    a_edge = float(after_metrics.get("mean_edge_density", 0.0))

    cavity_reduction = max(0.0, b_cavity - a_cavity)
    defect_reduction = b_defect - a_defect
    edge_smoothing = max(0.0, (b_edge - a_edge) / max(b_edge, 1.0) * 100.0)

    # Visual change score combining cavity disappearance + defect area drop + scene shift
    change_score = round(
        min(
            100.0,
            max(
                0.0,
                (cavity_reduction * 3.5) + (max(0.0, defect_reduction) * 1.8) + (edge_smoothing * 0.4) + ((100.0 - scene_similarity_pct) * 0.15),
            ),
        ),
        1,
    )

    if a_cavity <= 2.5 and (cavity_reduction >= 3.0 or defect_reduction >= 6.0):
        assessment = "significant_improvement"
        summary = (
            f"Detected dark cavity coverage dropped from {b_cavity}% to {a_cavity}% "
            f"(overall anomalous surface area {b_defect}% -> {a_defect}%). Visual restoration appears substantial; human sign-off required."
        )
    elif defect_reduction > 1.0 or cavity_reduction > 0.5:
        assessment = "moderate_change"
        summary = (
            f"Surface texture shifted ({b_defect}% -> {a_defect}% anomalous patches). "
            f"Inspector should verify asphalt compaction and edges before closure."
        )
    else:
        assessment = "minimal_change_review_needed"
        summary = (
            f"Post-repair image still exhibits {a_defect}% surface anomaly ({a_cavity}% dark patches vs {b_cavity}% initial). "
            f"Manual visual review strongly recommended before approving repair."
        )

    if scene_similarity_pct >= 62.0:
        scene_note = f"Consistent corridor framing detected ({scene_similarity_pct}% dHash structural similarity)."
    elif scene_similarity_pct >= 35.0:
        scene_note = f"Moderate viewpoint shift ({scene_similarity_pct}% structural similarity — likely different angle/lighting)."
    else:
        scene_note = f"Low framing similarity ({scene_similarity_pct}% dHash similarity) — verify photo was taken at the same site."

    return {
        "compared": True,
        "scene_similarity_pct": scene_similarity_pct,
        "visual_change_score": change_score,
        "before_defect_area_pct": b_defect,
        "after_defect_area_pct": a_defect,
        "before_cavity_pct": b_cavity,
        "after_cavity_pct": a_cavity,
        "defect_reduction_assessment": assessment,
        "scene_consistency_note": scene_note,
        "summary": summary,
        "requires_human_approval": True,
    }

