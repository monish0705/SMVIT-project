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


def test_embedded_exif_gps_extraction():
    from PIL import ExifTags
    from PIL.TiffImagePlugin import IFDRational

    img = Image.new("RGB", (200, 150), color=(90, 95, 100))
    exif = img.getexif()
    gps = exif.get_ifd(ExifTags.IFD.GPSInfo)
    gps[1] = "N"
    gps[2] = (IFDRational(12, 1), IFDRational(58, 1), IFDRational(234, 10))
    gps[3] = "E"
    gps[4] = (IFDRational(77, 1), IFDRational(38, 1), IFDRational(552, 10))
    exif[306] = "2026:11:03 10:42:00"

    buf = io.BytesIO()
    img.save(buf, format="JPEG", exif=exif)
    buf.seek(0)

    meta = extract_exif_metadata(buf)
    assert meta.has_exif is True
    assert round(meta.latitude, 4) == 12.9732
    assert round(meta.longitude, 4) == 77.6487
    assert meta.claimed_capture_time is not None

