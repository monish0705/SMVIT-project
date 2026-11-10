import json
import logging
import re
from typing import Dict, Any, Optional
from datetime import datetime, timezone
from app.core.config import settings

logger = logging.getLogger(__name__)

# Structured fallback analysis based on text heuristics when Gemini is not configured
def _heuristic_analysis(description: str, image_size: tuple) -> Dict[str, Any]:
    text = (description or "").lower()
    
    category = "pothole"
    if "crack" in text or "fissure" in text:
        category = "road_crack"
    elif "manhole" in text or "drain" in text:
        category = "manhole_depression"
    elif "uneven" in text or "ravelling" in text or "gravel" in text or "surface" in text:
        category = "surface_damage"
    elif "pothole" in text or "pit" in text or "crater" in text:
        category = "pothole"

    severity = "medium"
    if any(w in text for w in ["deep", "large", "huge", "dangerous", "severe", "accident", "emergency"]):
        severity = "high"
    elif any(w in text for w in ["minor", "small", "shallow", "hairline"]):
        severity = "low"

    uncertainties = ["Automated detection performed via deterministic heuristic baseline. Model key not set."]
    if not description:
        uncertainties.append("No contributor description provided for context.")

    return {
        "category": category,
        "visible_severity": severity,
        "image_quality": "adequate" if (image_size[0] >= 600 and image_size[1] >= 400) else "poor_resolution",
        "visual_evidence": f"Visible surface defect detected. Contributor notes: '{description or 'No description provided'}'.",
        "uncertainties": uncertainties,
        "needs_human_review": True,
        "confidence_score": 0.65,
        "is_fallback": True,
        "model_name": "CivicPulse-Rule-Based-Engine",
        "model_version": "1.0.0"
    }

async def analyze_defect_image(image_bytes: bytes, description: Optional[str] = None, image_dims: tuple = (800, 600)) -> Dict[str, Any]:
    """Analyze image using Gemini if configured, otherwise use deterministic fallback."""
    if not settings.GEMINI_API_KEY or settings.GEMINI_API_KEY.strip() == "":
        logger.info("GEMINI_API_KEY not configured. Using deterministic triage engine.")
        return _heuristic_analysis(description or "", image_dims)

    try:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=settings.GEMINI_API_KEY)
        
        prompt = f"""
You are the CivicPulse AI road infrastructure triage model.
Analyze this road surface photograph for municipal maintenance teams in Bengaluru, India.
Contributor description: "{description or 'None provided'}".

Strictly return a valid JSON object matching this schema:
{{
  "category": "pothole" | "road_crack" | "surface_damage" | "manhole_depression" | "other",
  "visible_severity": "high" | "medium" | "low",
  "image_quality": "good" | "adequate" | "poor_lighting" | "blurry" | "occluded",
  "visual_evidence": "Precise description of visible pavement defect, estimated dimensions or depth clues",
  "uncertainties": ["list any ambiguities like shadows, water obscuring depth, angle limitations"],
  "needs_human_review": true,
  "confidence_score": 0.0 to 1.0
}}

Important rules:
1. Do not invent facts not visible in the photo.
2. Needs_human_review must ALWAYS be true (human-in-the-loop requirement).
3. Do not include markdown code block formatting; return pure JSON only.
"""

        response = client.models.generate_content(
            model=settings.GEMINI_MODEL,
            contents=[
                types.Part.from_bytes(data=image_bytes, mime_type="image/jpeg"),
                prompt
            ]
        )

        response_text = response.text.strip()
        # Clean any accidental markdown code fences
        if response_text.startswith("```"):
            response_text = re.sub(r"^```(?:json)?\s*", "", response_text)
            response_text = re.sub(r"\s*```$", "", response_text)

        parsed = json.loads(response_text)
        parsed["is_fallback"] = False
        parsed["model_name"] = settings.GEMINI_MODEL
        parsed["model_version"] = "gemini-3.8-flash-api"
        # Force human review per safety specification
        parsed["needs_human_review"] = True
        return parsed

    except Exception as e:
        logger.error(f"Gemini API analysis failed: {e}. Falling back to deterministic triage.")
        fallback = _heuristic_analysis(description or "", image_dims)
        fallback["uncertainties"].append(f"Gemini API call failed: {str(e)[:80]}")
        return fallback

