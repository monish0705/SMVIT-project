import math
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.models.incident import Incident
from app.models.evidence_asset import EvidenceAsset
from app.services.geoproof import hamming_distance

logger = logging.getLogger(__name__)

def haversine_distance_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate the great-circle distance between two points on Earth in metres."""
    if lat1 is None or lon1 is None or lat2 is None or lon2 is None:
        return 999999.0
    R = 6371000.0  # Earth radius in metres
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return round(R * c, 2)

def text_similarity_jaccard(text1: Optional[str], text2: Optional[str]) -> float:
    """Compute token Jaccard similarity for short descriptions."""
    if not text1 or not text2:
        return 0.0
    words1 = set(text1.lower().replace(",", " ").replace(".", " ").split())
    words2 = set(text2.lower().replace(",", " ").replace(".", " ").split())
    if not words1 or not words2:
        return 0.0
    intersection = words1.intersection(words2)
    union = words1.union(words2)
    return len(intersection) / len(union)

class DuplicateMatch:
    def __init__(self, incident: Incident, score: float, reasons: List[str], distance_m: float):
        self.incident = incident
        self.score = score
        self.reasons = reasons
        self.distance_m = distance_m

def find_duplicate_candidates(
    db: Session,
    latitude: Optional[float],
    longitude: Optional[float],
    accuracy_m: Optional[float],
    sha256: Optional[str],
    perceptual_hash: Optional[str],
    category: str,
    description: Optional[str],
    current_incident_id: Optional[str] = None,
    max_search_distance_m: float = 120.0
) -> List[DuplicateMatch]:
    """Search existing open/active incidents to detect possible duplicates using multi-factor signals."""
    matches: List[DuplicateMatch] = []
    
    # Query non-closed, non-rejected incidents
    query = db.query(Incident).filter(Incident.current_status.notin_(["closed", "rejected"]))
    if current_incident_id:
        query = query.filter(Incident.id != current_incident_id)
        
    candidates = query.all()
    
    for inc in candidates:
        reasons = []
        spatial_score = 0.0
        image_score = 0.0
        text_score = 0.0
        category_score = 0.0
        
        # 1. Spatial Proximity
        dist_m = 999999.0
        if latitude is not None and longitude is not None and inc.latitude is not None and inc.longitude is not None:
            dist_m = haversine_distance_m(latitude, longitude, inc.latitude, inc.longitude)
            # Account for accuracy tolerances
            effective_tolerance = max(25.0, (accuracy_m or 15.0) + (inc.location_accuracy_m or 15.0))
            
            if dist_m <= 15.0:
                spatial_score = 1.0
                reasons.append(f"Immediate spatial proximity: {int(dist_m)}m apart")
            elif dist_m <= effective_tolerance:
                spatial_score = 0.8
                reasons.append(f"Close spatial proximity within GPS uncertainty radius ({int(dist_m)}m apart, ±{int(effective_tolerance)}m tolerance)")
            elif dist_m <= max_search_distance_m:
                spatial_score = max(0.0, 1.0 - (dist_m / max_search_distance_m))
                reasons.append(f"Nearby on road corridor: {int(dist_m)}m apart")

        # 2. Category Match
        if category and inc.category and category.lower() == inc.category.lower():
            category_score = 1.0
            reasons.append(f"Matching defect category: {inc.category}")

        # 3. Description Similarity
        t_sim = text_similarity_jaccard(description, inc.description or inc.title)
        if t_sim > 0.25:
            text_score = min(1.0, t_sim * 1.5)
            reasons.append(f"High description vocabulary overlap ({int(t_sim * 100)}% match)")

        # 4. Image Similarity Check
        # Check assets associated with candidate incident
        if sha256 or perceptual_hash:
            for asset in inc.evidence_assets:
                if sha256 and asset.sha256 == sha256:
                    image_score = 1.0
                    reasons.append("Exact identical image SHA-256 hash detected (Duplicate photo upload)")
                    break
                elif perceptual_hash and asset.perceptual_hash:
                    dist = hamming_distance(perceptual_hash, asset.perceptual_hash)
                    if dist <= 6:
                        image_score = max(image_score, 0.95)
                        reasons.append(f"Perceptual image match: near-identical visual scene (dHash distance: {dist})")
                        break
                    elif dist <= 12:
                        image_score = max(image_score, 0.70)
                        reasons.append(f"Visually similar road defect image (dHash distance: {dist})")

        # Weighted aggregate score
        total_score = (
            (spatial_score * 0.45) +
            (image_score * 0.35) +
            (category_score * 0.10) +
            (text_score * 0.10)
        )
        
        # If identical image, boost significantly
        if image_score >= 0.95:
            total_score = max(total_score, 0.90)

        # Retain if it exceeds threshold (e.g. 0.45 or exact image)
        if total_score >= 0.45 or (spatial_score >= 0.8 and category_score >= 0.8):
            matches.append(DuplicateMatch(
                incident=inc,
                score=round(total_score, 3),
                reasons=reasons,
                distance_m=dist_m
            ))

    # Sort descending by score
    matches.sort(key=lambda m: m.score, reverse=True)
    return matches

