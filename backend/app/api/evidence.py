import os
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.api.deps import get_db
from app.core.bootstrap import (
    DEMO_SCENARIOS,
    SYNTHETIC_AUTHOR,
    create_synthetic_road_image,
    create_synthetic_repaired_road_image,
)
from app.models.evidence_asset import EvidenceAsset
from app.models.incident import Incident
from app.models.observation import Observation
from app.services.geoproof import process_intake_image

router = APIRouter(prefix="/evidence", tags=["Evidence Assets"])


def _ensure_synthetic_asset_on_disk(asset: EvidenceAsset, db: Session) -> None:
    """Rehydrate synthetic demo images into writable storage if /tmp cleared between serverless invocations."""
    obs = db.query(Observation).filter(Observation.id == asset.observation_id).first()
    if not obs or obs.submitted_by != SYNTHETIC_AUTHOR:
        return
    inc = db.query(Incident).filter(Incident.id == asset.incident_id).first()
    if not inc:
        return

    scenario = next((s for s in DEMO_SCENARIOS if s["num"] == inc.incident_number), None)
    severity = scenario["severity"] if scenario else "medium"
    seed = scenario["seed"] if scenario else 42

    if asset.is_repair_evidence:
        img_bytes = create_synthetic_repaired_road_image(seed)
        inc_label = f"{inc.incident_number}-REPAIR"
        time_label = "Repaired"
        ver_status = "Resolution Verified" if inc.current_status == "closed" else "Pending Resolution Review"
    else:
        img_bytes = create_synthetic_road_image(inc.category, severity, seed)
        inc_label = inc.incident_number
        time_label = "Captured" if inc.location_source == "photo_exif" else "Reported"
        ver_status = "Field Verified" if inc.current_status in ["field_verified", "resolution_verified", "closed"] else "Unverified"

    intake = process_intake_image(
        file_bytes=img_bytes,
        incident_number=inc_label,
        readable_address=inc.readable_address,
        latitude=inc.latitude,
        longitude=inc.longitude,
        location_source=inc.location_source,
        accuracy_m=inc.location_accuracy_m,
        timestamp=inc.created_at,
        time_label=time_label,
        verification_status=ver_status,
    )
    asset.original_path = intake["original_path"]
    asset.annotated_path = intake["annotated_path"]
    asset.thumbnail_path = intake["thumbnail_path"]
    db.commit()


@router.get("/{asset_id}/original")
def get_original_evidence_image(asset_id: str, db: Session = Depends(get_db)):
    """Retrieve original unmodified intake photograph."""
    asset = db.query(EvidenceAsset).filter(EvidenceAsset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Original evidence asset not found.")
    if not asset.original_path or not os.path.exists(asset.original_path):
        _ensure_synthetic_asset_on_disk(asset, db)
    if not asset.original_path or not os.path.exists(asset.original_path):
        raise HTTPException(status_code=404, detail="Original evidence asset not found.")
    return FileResponse(
        path=asset.original_path,
        media_type=asset.mime_type or "image/jpeg",
        filename=os.path.basename(asset.original_path),
    )


@router.get("/{asset_id}/annotated")
def get_annotated_geoproof_image(asset_id: str, db: Session = Depends(get_db)):
    """Retrieve GeoProof watermarked derivative photograph."""
    asset = db.query(EvidenceAsset).filter(EvidenceAsset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Annotated GeoProof asset not found.")
    if not asset.annotated_path or not os.path.exists(asset.annotated_path):
        _ensure_synthetic_asset_on_disk(asset, db)
    if not asset.annotated_path or not os.path.exists(asset.annotated_path):
        if asset.original_path and os.path.exists(asset.original_path):
            return FileResponse(path=asset.original_path, media_type=asset.mime_type or "image/jpeg")
        raise HTTPException(status_code=404, detail="Annotated GeoProof asset not found.")
    return FileResponse(
        path=asset.annotated_path,
        media_type="image/jpeg",
        filename=os.path.basename(asset.annotated_path),
    )


@router.get("/{asset_id}/thumbnail")
def get_thumbnail_image(asset_id: str, db: Session = Depends(get_db)):
    """Retrieve fast thumbnail for cards and map popups."""
    asset = db.query(EvidenceAsset).filter(EvidenceAsset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found.")

    if not ((asset.thumbnail_path and os.path.exists(asset.thumbnail_path)) or (asset.annotated_path and os.path.exists(asset.annotated_path))):
        _ensure_synthetic_asset_on_disk(asset, db)

    if asset.thumbnail_path and os.path.exists(asset.thumbnail_path):
        return FileResponse(path=asset.thumbnail_path, media_type="image/jpeg")
    if asset.annotated_path and os.path.exists(asset.annotated_path):
        return FileResponse(path=asset.annotated_path, media_type="image/jpeg")
    if asset.original_path and os.path.exists(asset.original_path):
        return FileResponse(path=asset.original_path, media_type=asset.mime_type or "image/jpeg")
    raise HTTPException(status_code=404, detail="Image file unavailable.")
