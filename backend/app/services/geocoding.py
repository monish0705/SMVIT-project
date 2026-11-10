import logging
from typing import Optional, Dict
import httpx
from app.core.config import settings

logger = logging.getLogger(__name__)

# In-memory cache for coordinates to avoid repetitive Nominatim calls
_GEOCODE_CACHE: Dict[str, str] = {}

# Approximate offline Bengaluru localities for offline fallback
BENGALURU_ZONES = [
    (13.100, 13.160, 77.550, 77.630, "Yelahanka New Town, Bengaluru"),
    (12.970, 12.985, 77.620, 77.660, "Indiranagar 100ft Road, Bengaluru"),
    (12.925, 12.945, 77.610, 77.640, "Koramangala 4th Block, Bengaluru"),
    (12.965, 12.990, 77.720, 77.760, "Whitefield Main Road, Bengaluru"),
    (12.835, 12.860, 77.660, 77.690, "Electronic City Phase 1, Hosur Road, Bengaluru"),
    (13.020, 13.050, 77.580, 77.610, "Hebbal Flyover, Bellary Road, Bengaluru"),
    (12.915, 12.940, 77.560, 77.600, "Jayanagar 4th Block, Bengaluru"),
    (12.910, 12.935, 77.570, 77.600, "JP Nagar 2nd Phase, Bengaluru"),
    (12.920, 12.950, 77.660, 77.700, "Outer Ring Road, Bellandur, Bengaluru"),
    (12.970, 12.980, 77.590, 77.615, "MG Road / Brigade Road Junction, Bengaluru"),
    (13.000, 13.030, 77.560, 77.585, "Malleshwaram 18th Cross, Bengaluru"),
]

def _get_offline_label(lat: float, lon: float) -> str:
    """Provide a reliable offline geographical label if network/geocoder is unreachable."""
    for lat_min, lat_max, lon_min, lon_max, name in BENGALURU_ZONES:
        if lat_min <= lat <= lat_max and lon_min <= lon <= lon_max:
            return name
    # Default within Karnataka / Bengaluru
    if 12.75 <= lat <= 13.25 and 77.40 <= lon <= 77.85:
        return f"Bengaluru Urban District ({round(lat, 4)}° N, {round(lon, 4)}° E)"
    return f"Geographical Point ({round(lat, 4)}°, {round(lon, 4)}°)"

async def reverse_geocode(latitude: float, longitude: float) -> str:
    """Reverse geocode coordinates into a human-readable street/locality address."""
    cache_key = f"{round(latitude, 4)},{round(longitude, 4)}"
    if cache_key in _GEOCODE_CACHE:
        return _GEOCODE_CACHE[cache_key]

    # Attempt Nominatim with timeout and proper User-Agent
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            headers = {"User-Agent": settings.NOMINATIM_USER_AGENT}
            url = f"{settings.NOMINATIM_BASE_URL}/reverse"
            params = {
                "lat": latitude,
                "lon": longitude,
                "format": "jsonv2",
                "addressdetails": 1,
                "zoom": 17
            }
            response = await client.get(url, params=params, headers=headers)
            if response.status_code == 200:
                data = response.json()
                address_parts = []
                addr = data.get("address", {})
                
                road = addr.get("road") or addr.get("pedestrian") or addr.get("path")
                suburb = addr.get("suburb") or addr.get("neighbourhood") or addr.get("residential")
                city = addr.get("city") or addr.get("town") or addr.get("state_district") or "Bengaluru"
                
                if road:
                    address_parts.append(road)
                if suburb and suburb not in address_parts:
                    address_parts.append(suburb)
                if city and city not in address_parts:
                    address_parts.append(city)
                    
                display_label = ", ".join(address_parts) if address_parts else data.get("display_name", "")
                if display_label:
                    _GEOCODE_CACHE[cache_key] = display_label
                    return display_label
    except Exception as e:
        logger.info(f"Nominatim lookup timed out or failed ({e}); using offline GIS zone mapper.")

    # Graceful fallback to local zone mapper
    fallback_label = _get_offline_label(latitude, longitude)
    _GEOCODE_CACHE[cache_key] = fallback_label
    return fallback_label

