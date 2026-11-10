import hashlib
import os
import math
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, Tuple, Dict, Any
from PIL import Image, ImageDraw, ImageFont
from app.core.config import settings

def compute_sha256(file_bytes: bytes) -> str:
    """Compute SHA-256 checksum of raw image bytes at intake."""
    return hashlib.sha256(file_bytes).hexdigest()

def compute_dhash(image: Image.Image, hash_size: int = 8) -> str:
    """Compute perceptual difference hash (dHash) without external C dependencies."""
    # Convert to grayscale and resize to (hash_size + 1, hash_size)
    img_gray = image.convert("L").resize((hash_size + 1, hash_size), Image.Resampling.LANCZOS)
    pixels = list(img_gray.getdata())
    
    difference = []
    for row in range(hash_size):
        for col in range(hash_size):
            pixel_left = pixels[row * (hash_size + 1) + col]
            pixel_right = pixels[row * (hash_size + 1) + col + 1]
            difference.append(pixel_left > pixel_right)
            
    # Convert bool array to hexadecimal string (64 bits = 16 hex characters)
    decimal_val = 0
    hex_str = []
    for index, val in enumerate(difference):
        if val:
            decimal_val += 2 ** (index % 4)
        if (index % 4) == 3:
            hex_str.append(hex(decimal_val)[2:])
            decimal_val = 0
    return "".join(hex_str)

def hamming_distance(hash1: str, hash2: str) -> int:
    """Calculate hamming distance between two hex perceptual hashes."""
    if not hash1 or not hash2 or len(hash1) != len(hash2):
        return 64
    dist = 0
    for c1, c2 in zip(hash1, hash2):
        n1 = int(c1, 16)
        n2 = int(c2, 16)
        dist += bin(n1 ^ n2).count("1")
    return dist

def _get_font(size: int):
    """Load default font or scalable font."""
    try:
        # Try Windows standard fonts if available
        font_paths = [
            "C:/Windows/Fonts/segoeui.ttf",
            "C:/Windows/Fonts/arial.ttf",
            "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
        ]
        for p in font_paths:
            if os.path.exists(p):
                return ImageFont.truetype(p, size)
    except Exception:
        pass
    return ImageFont.load_default()

def draw_locator_radar(draw: ImageDraw.ImageDraw, box: Tuple[int, int, int, int], accuracy_m: Optional[float] = None):
    """Draw a professional coordinate mini-graphic / radar icon."""
    x0, y0, x1, y1 = box
    cx = (x0 + x1) // 2
    cy = (y0 + y1) // 2
    radius = min(x1 - x0, y1 - y0) // 2 - 4

    # Radar circles
    draw.ellipse([cx - radius, cy - radius, cx + radius, cy + radius], outline=(13, 148, 136, 180), width=2)
    draw.ellipse([cx - radius // 2, cy - radius // 2, cx + radius // 2, cy + radius // 2], outline=(13, 148, 136, 120), width=1)
    
    # Crosshairs
    draw.line([cx - radius, cy, cx + radius, cy], fill=(13, 148, 136, 150), width=1)
    draw.line([cx, cy - radius, cx, cy + radius], fill=(13, 148, 136, 150), width=1)
    
    # Center target pin
    pin_r = 5
    draw.ellipse([cx - pin_r, cy - pin_r, cx + pin_r, cy + pin_r], fill=(239, 68, 68, 240), outline=(255, 255, 255, 255), width=2)
    
    # Accuracy text
    acc_text = f"±{int(accuracy_m)}m" if accuracy_m else "GPS Loc"
    font = _get_font(10)
    draw.text((cx - 18, y1 - 12), acc_text, fill=(203, 213, 225, 220), font=font)

def create_geoproof_overlay(
    image: Image.Image,
    incident_number: str,
    readable_address: Optional[str],
    latitude: Optional[float],
    longitude: Optional[float],
    location_source: str,
    accuracy_m: Optional[float] = None,
    timestamp: Optional[datetime] = None,
    time_label: str = "Captured",
    verification_status: str = "Unverified"
) -> Image.Image:
    """Generate a clean, high-contrast, professional GeoProof evidence watermark overlay."""
    annotated = image.copy().convert("RGBA")
    w, h = annotated.size

    # Responsive banner height based on image dimensions
    banner_height = max(110, int(h * 0.16))
    if banner_height > 180:
        banner_height = 180

    # Semi-transparent dark navy overlay banner at the bottom
    overlay = Image.new("RGBA", (w, banner_height), (15, 23, 42, 225))  # Slate-900 with opacity
    annotated.paste(overlay, (0, h - banner_height), overlay)

    draw = ImageDraw.Draw(annotated)

    # Accent bar on top of the banner
    draw.rectangle([0, h - banner_height, w, h - banner_height + 4], fill=(13, 148, 136, 255))  # Teal-600

    # Text fonts
    font_title = _get_font(max(14, int(banner_height * 0.15)))
    font_body = _get_font(max(11, int(banner_height * 0.11)))
    font_badge = _get_font(max(10, int(banner_height * 0.09)))

    pad_left = 20
    top_pos = h - banner_height + 12

    # Brand & ID line
    brand_text = f"CIVICPULSE AI  |  EVIDENCE RECORD #{incident_number}"
    draw.text((pad_left, top_pos), brand_text, fill=(255, 255, 255, 255), font=font_title)

    # Status tag badge
    badge_bg = (239, 68, 68, 200) if "Unverified" in verification_status else (16, 185, 129, 200)
    badge_x = pad_left + len(brand_text) * 8 + 15
    if badge_x < w - 160:
        draw.rounded_rectangle([badge_x, top_pos - 2, badge_x + 95, top_pos + 18], radius=3, fill=badge_bg)
        draw.text((badge_x + 8, top_pos), verification_status.upper(), fill=(255, 255, 255, 255), font=font_badge)

    line_spacing = max(18, int(banner_height * 0.18))
    cur_y = top_pos + line_spacing + 4

    # Location address line
    addr_text = f"Location: {readable_address or 'Coordinates recorded (Address pending)'}"
    if len(addr_text) > 75:
        addr_text = addr_text[:72] + "..."
    draw.text((pad_left, cur_y), addr_text, fill=(226, 232, 240, 240), font=font_body)

    cur_y += line_spacing

    # Coordinates & Accuracy
    coords_text = f"GPS: {round(latitude, 5)}° N, {round(longitude, 5)}° E" if (latitude and longitude) else "GPS: Location pending / Map pin required"
    acc_text = f" | Accuracy: ±{round(accuracy_m, 1)}m" if accuracy_m else ""
    draw.text((pad_left, cur_y), coords_text + acc_text, fill=(148, 163, 184, 240), font=font_body)

    cur_y += line_spacing

    # Provenance and Timestamp
    time_str = timestamp.strftime("%Y-%m-%d %H:%M:%S UTC") if timestamp else "Time recorded at submission"
    source_map = {
        "photo_exif": "Photo EXIF Metadata (Claimed)",
        "device_gps_at_capture": "Device GPS at Camera Capture",
        "device_gps_at_submission": "Uploader Location at Submission",
        "manual_map_pin": "User-Selected Map Location",
        "inspector_confirmed": "Field Inspector Confirmed Location",
    }
    source_display = source_map.get(location_source, location_source)
    meta_line = f"{time_label}: {time_str}  |  Source: {source_display}"
    draw.text((pad_left, cur_y), meta_line, fill=(94, 234, 212, 240), font=font_body)

    # Draw radar mini-graphic on right side if space permits
    if w > 450:
        radar_size = banner_height - 30
        radar_box = (w - radar_size - 25, h - banner_height + 15, w - 25, h - 15)
        draw_locator_radar(draw, radar_box, accuracy_m)

    return annotated.convert("RGB")

def process_intake_image(
    file_bytes: bytes,
    incident_number: str,
    readable_address: Optional[str],
    latitude: Optional[float],
    longitude: Optional[float],
    location_source: str,
    accuracy_m: Optional[float] = None,
    timestamp: Optional[datetime] = None,
    time_label: str = "Captured",
    verification_status: str = "Unverified"
) -> Dict[str, Any]:
    """Process uploaded image: compute SHA-256, dHash, create thumbnail, and generate GeoProof overlay."""
    import io
    sha256 = compute_sha256(file_bytes)
    
    with Image.open(io.BytesIO(file_bytes)) as pil_img:
        width, height = pil_img.size
        # Normalize orientation if EXIF tag 274 present
        try:
            import PIL.ImageOps
            pil_img = PIL.ImageOps.exif_transpose(pil_img)
            width, height = pil_img.size
        except Exception:
            pass

        # Convert RGBA/LA/P modes (e.g. PNG with transparency) to RGB before JPEG encoding
        if pil_img.mode in ("RGBA", "LA", "P"):
            rgb_canvas = Image.new("RGB", pil_img.size, (255, 255, 255))
            if pil_img.mode == "P":
                pil_img = pil_img.convert("RGBA")
            if "A" in pil_img.mode:
                rgb_canvas.paste(pil_img, mask=pil_img.split()[-1])
            else:
                rgb_canvas.paste(pil_img)
            pil_img = rgb_canvas
        elif pil_img.mode != "RGB":
            pil_img = pil_img.convert("RGB")
            
        dhash = compute_dhash(pil_img)
        
        # Save original unmodified (as clean RGB JPEG)
        orig_filename = f"{incident_number}_orig_{sha256[:12]}.jpg"
        orig_path = Path(settings.ORIGINALS_PATH) / orig_filename
        pil_img.save(orig_path, format="JPEG", quality=95)
        
        # Generate thumbnail
        thumb_img = pil_img.copy()
        thumb_img.thumbnail((320, 320))
        thumb_filename = f"{incident_number}_thumb_{sha256[:12]}.jpg"
        thumb_path = Path(settings.THUMBNAILS_PATH) / thumb_filename
        thumb_img.save(thumb_path, format="JPEG", quality=85)
        
        # Generate annotated GeoProof derivative
        annotated_img = create_geoproof_overlay(
            image=pil_img,
            incident_number=incident_number,
            readable_address=readable_address,
            latitude=latitude,
            longitude=longitude,
            location_source=location_source,
            accuracy_m=accuracy_m,
            timestamp=timestamp,
            time_label=time_label,
            verification_status=verification_status
        )
        
        ann_filename = f"{incident_number}_geoproof_{sha256[:12]}.jpg"
        ann_path = Path(settings.ANNOTATED_PATH) / ann_filename
        annotated_img.save(ann_path, format="JPEG", quality=92)

    return {
        "sha256": sha256,
        "perceptual_hash": dhash,
        "width": width,
        "height": height,
        "file_size": len(file_bytes),
        "original_path": str(orig_path),
        "annotated_path": str(ann_path),
        "thumbnail_path": str(thumb_path),
        "original_filename": orig_filename,
        "annotated_filename": ann_filename,
        "thumbnail_filename": thumb_filename
    }

