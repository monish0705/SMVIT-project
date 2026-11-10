import logging
from typing import Optional, Dict, Any, Tuple
from datetime import datetime, timezone
from PIL import Image, ExifTags

logger = logging.getLogger(__name__)

class ExifMetadata:
    def __init__(
        self,
        has_exif: bool = False,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
        altitude_m: Optional[float] = None,
        claimed_capture_time: Optional[datetime] = None,
        camera_make: Optional[str] = None,
        camera_model: Optional[str] = None,
        raw_exif: Optional[Dict[str, Any]] = None
    ):
        self.has_exif = has_exif
        self.latitude = latitude
        self.longitude = longitude
        self.altitude_m = altitude_m
        self.claimed_capture_time = claimed_capture_time
        self.camera_make = camera_make
        self.camera_model = camera_model
        self.raw_exif = raw_exif or {}

def _convert_dms_to_dd(dms_values, ref: str) -> Optional[float]:
    """Convert degrees, minutes, seconds rational tuple into decimal degrees."""
    try:
        def _to_float(val):
            if hasattr(val, "numerator") and hasattr(val, "denominator"):
                return float(val.numerator) / float(val.denominator) if val.denominator != 0 else 0.0
            if isinstance(val, tuple) and len(val) == 2:
                return float(val[0]) / float(val[1]) if val[1] != 0 else 0.0
            return float(val)

        d = _to_float(dms_values[0])
        m = _to_float(dms_values[1])
        s = _to_float(dms_values[2])
        dd = d + (m / 60.0) + (s / 3600.0)
        if ref.upper() in ["S", "W"]:
            dd = -dd
        return round(dd, 6)
    except Exception as e:
        logger.warning(f"Failed to convert DMS to DD: {e}")
        return None

def extract_exif_metadata(image_path_or_file) -> ExifMetadata:
    """Safely extract EXIF metadata, GPS, and timestamp from an image."""
    try:
        with Image.open(image_path_or_file) as img:
            exif_raw = img.getexif()
            if not exif_raw:
                return ExifMetadata(has_exif=False)

            has_exif = True
            claimed_capture_time = None
            camera_make = None
            camera_model = None
            latitude = None
            longitude = None
            altitude_m = None
            parsed_raw = {}

            # Process basic EXIF tags
            for tag_id, value in exif_raw.items():
                tag_name = ExifTags.TAGS.get(tag_id, str(tag_id))
                if isinstance(value, (str, int, float)):
                    parsed_raw[tag_name] = value

            camera_make = str(parsed_raw.get("Make", "")).strip() or None
            camera_model = str(parsed_raw.get("Model", "")).strip() or None

            # Timestamp parsing
            date_str = parsed_raw.get("DateTimeOriginal") or parsed_raw.get("DateTime")
            if date_str and isinstance(date_str, str):
                for fmt in ["%Y:%m:%d %H:%M:%S", "%Y-%m-%d %H:%M:%S", "%Y/%m/%d %H:%M:%S"]:
                    try:
                        claimed_capture_time = datetime.strptime(date_str.strip(), fmt).replace(tzinfo=timezone.utc)
                        break
                    except ValueError:
                        continue

            # Process GPS IFD
            # In Pillow, IFD.GPSInfo is tag 0x8825 (34853)
            gps_ifd = None
            try:
                gps_ifd = exif_raw.get_ifd(ExifTags.IFD.GPSInfo)
            except Exception:
                # Fallback to direct lookup
                gps_ifd = exif_raw.get(34853)

            if gps_ifd:
                gps_tags = {}
                for key, val in gps_ifd.items():
                    name = ExifTags.GPSTAGS.get(key, str(key))
                    gps_tags[name] = val

                lat_val = gps_tags.get("GPSLatitude")
                lat_ref = gps_tags.get("GPSLatitudeRef")
                lon_val = gps_tags.get("GPSLongitude")
                lon_ref = gps_tags.get("GPSLongitudeRef")

                if lat_val and lat_ref and lon_val and lon_ref:
                    latitude = _convert_dms_to_dd(lat_val, str(lat_ref))
                    longitude = _convert_dms_to_dd(lon_val, str(lon_ref))

                    # Validate range
                    if latitude is not None and not (-90.0 <= latitude <= 90.0):
                        latitude = None
                    if longitude is not None and not (-180.0 <= longitude <= 180.0):
                        longitude = None

                alt_val = gps_tags.get("GPSAltitude")
                if alt_val:
                    try:
                        if hasattr(alt_val, "numerator") and hasattr(alt_val, "denominator"):
                            altitude_m = float(alt_val.numerator) / float(alt_val.denominator) if alt_val.denominator != 0 else None
                        else:
                            altitude_m = float(alt_val)
                    except Exception:
                        pass

            return ExifMetadata(
                has_exif=has_exif,
                latitude=latitude,
                longitude=longitude,
                altitude_m=altitude_m,
                claimed_capture_time=claimed_capture_time,
                camera_make=camera_make,
                camera_model=camera_model,
                raw_exif=parsed_raw
            )
    except Exception as e:
        logger.error(f"Error reading EXIF data: {e}")
        return ExifMetadata(has_exif=False)

