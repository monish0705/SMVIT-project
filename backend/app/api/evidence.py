import os
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.api.deps import get_db
from app.models.evidence_asset import EvidenceAsset

router = APIRouter(prefix="/evidence", tags=["Evidence Assets"])

@router.get("/{asset_id}/original")
def get_original_evidence_image(asset_id: str, db: Session = Depends(get_db)):
    """Retrieve original unmodified intake photograph."""
    asset = db.query(EvidenceAsset).filter(EvidenceAsset.id == asset_id).first()
    if not asset or not asset.original_path or not os.path.exists(asset.original_path):
        raise HTTPException(status_code=404, detail="Original evidence asset not found.")
    return FileResponse(
        path=asset.original_path,
        media_type=asset.mime_type or "image/jpeg",
        filename=os.path.basename(asset.original_path)
    )

@router.get("/{asset_id}/annotated")
def get_annotated_geoproof_image(asset_id: str, db: Session = Depends(get_db)):
    """Retrieve GeoProof watermarked derivative photograph."""
    asset = db.query(EvidenceAsset).filter(EvidenceAsset.id == asset_id).first()
    if not asset or not asset.annotated_path or not os.path.exists(asset.annotated_path):
        # Fallback to original if annotated is missing
        if asset and asset.original_path and os.path.exists(asset.original_path):
            return FileResponse(path=asset.original_path, media_type=asset.mime_type or "image/jpeg")
        raise HTTPException(status_code=404, detail="Annotated GeoProof asset not found.")
    return FileResponse(
        path=asset.annotated_path,
        media_type="image/jpeg",
        filename=os.path.basename(asset.annotated_path)
    )

@router.get("/{asset_id}/thumbnail")
def get_thumbnail_image(asset_id: str, db: Session = Depends(get_db)):
    """Retrieve fast thumbnail for cards and map popups."""
    asset = db.query(EvidenceAsset).filter(EvidenceAsset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found.")
    
    if asset.thumbnail_path and os.path.exists(asset.thumbnail_path):
        return FileResponse(path=asset.thumbnail_path, media_type="image/jpeg")
    elif asset.annotated_path and os.path.exists(asset.annotated_path):
        return FileResponse(path=asset.annotated_path, media_type="image/jpeg")
    elif asset.original_path and os.path.exists(asset.original_path):
        return FileResponse(path=asset.original_path, media_type=asset.mime_type or "image/jpeg")
    raise HTTPException(status_code=404, detail="Image file unavailable.")

