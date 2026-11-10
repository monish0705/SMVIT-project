from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.geocoding import reverse_geocode

router = APIRouter(prefix="/location", tags=["Location & GIS"])

class ReverseGeocodeRequest(BaseModel):
    latitude: float
    longitude: float

class ReverseGeocodeResponse(BaseModel):
    latitude: float
    longitude: float
    readable_address: str

@router.post("/reverse-geocode", response_model=ReverseGeocodeResponse)
async def get_address_from_coordinates(req: ReverseGeocodeRequest):
    """Convert coordinates into readable street / locality address with rate limiting and caching."""
    if not (-90.0 <= req.latitude <= 90.0) or not (-180.0 <= req.longitude <= 180.0):
        raise HTTPException(status_code=400, detail="Coordinates outside valid Earth latitude/longitude ranges.")
    
    address = await reverse_geocode(req.latitude, req.longitude)
    return ReverseGeocodeResponse(
        latitude=req.latitude,
        longitude=req.longitude,
        readable_address=address
    )

