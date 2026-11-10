import io
from PIL import Image
from app.services.exif_parser import extract_exif_metadata, _convert_dms_to_dd

def test_convert_dms_to_dd():
    # 12 deg, 58 min, 23.4 sec N
    dms = ((12, 1), (58, 1), (234, 10))
    dd = _convert_dms_to_dd(dms, "N")
    assert dd is not None
    assert round(dd, 2) == 12.97

    # South should be negative
    dd_s = _convert_dms_to_dd(dms, "S")
    assert dd_s is not None
    assert round(dd_s, 2) == -12.97

def test_missing_exif():
    # Plain image with no EXIF tags
    img = Image.new("RGB", (100, 100), color="blue")
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    buf.seek(0)

    meta = extract_exif_metadata(buf)
    assert meta.has_exif is False
    assert meta.latitude is None
    assert meta.longitude is None

