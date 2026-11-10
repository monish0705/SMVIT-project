import io
from PIL import Image
from app.services.geoproof import compute_sha256, compute_dhash, hamming_distance, create_geoproof_overlay

def test_sha256_computation():
    data = b"CivicPulse AI GeoProof Test Bytes"
    h1 = compute_sha256(data)
    h2 = compute_sha256(data)
    assert h1 == h2
    assert len(h1) == 64

def test_dhash_and_hamming_distance():
    img1 = Image.new("RGB", (200, 200), color=(128, 128, 128))
    img2 = Image.new("RGB", (200, 200), color=(128, 128, 128))
    
    h1 = compute_dhash(img1)
    h2 = compute_dhash(img2)
    assert h1 == h2
    assert hamming_distance(h1, h2) == 0

def test_watermark_overlay_generation():
    img = Image.new("RGB", (800, 600), color=(50, 60, 70))
    annotated = create_geoproof_overlay(
        image=img,
        incident_number="INF-9999",
        readable_address="Indiranagar, Bengaluru",
        latitude=12.9716,
        longitude=77.5946,
        location_source="photo_exif",
        accuracy_m=12.5,
        verification_status="Unverified"
    )
    assert annotated.size == (800, 600)
    assert annotated.mode == "RGB"

