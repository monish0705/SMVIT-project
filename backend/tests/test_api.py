import io
from PIL import Image

def test_health_check(client):
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.json()["status"] == "healthy"

def test_auth_login(client):
    res = client.post("/api/auth/login", json={
        "email": "admin@civicpulse.ai",
        "password": "Admin@CivicPulse2026!"
    })
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["role"] == "admin"

def test_list_incidents(client):
    res = client.get("/api/incidents")
    assert res.status_code == 200
    incidents = res.json()
    assert len(incidents) > 0
    assert "incident_number" in incidents[0]

def test_incident_stats(client):
    res = client.get("/api/incidents/stats")
    assert res.status_code == 200
    stats = res.json()
    assert stats["total_incidents"] >= 15
    assert "by_category" in stats
    assert "by_priority" in stats

def test_reverse_geocode_api(client):
    res = client.post("/api/location/reverse-geocode", json={
        "latitude": 12.9716,
        "longitude": 77.5946
    })
    assert res.status_code == 200
    data = res.json()
    assert "readable_address" in data

def test_copilot_assistant(client):
    res = client.post("/api/assistant/chat", json={
        "query": "Which five incidents need inspection first?"
    })
    assert res.status_code == 200
    data = res.json()
    assert len(data["tools_executed"]) > 0
    assert len(data["referenced_incidents"]) > 0


def test_cv_image_analysis_and_before_after_comparison():
    from PIL import ImageDraw
    from app.services.image_analysis import compute_cv_image_analysis
    from app.services.resolution_comparator import compare_before_after_repair

    # Create synthetic asphalt image with dark central pothole cavity
    img_before = Image.new("RGB", (640, 480), (110, 115, 120))
    draw = ImageDraw.Draw(img_before)
    draw.ellipse([220, 160, 420, 320], fill=(18, 20, 24))
    buf_before = io.BytesIO()
    img_before.save(buf_before, format="JPEG", quality=92)
    before_bytes = buf_before.getvalue()

    cv = compute_cv_image_analysis(before_bytes, "")
    assert cv["category"] == "pothole"
    assert len(cv["detected_regions"]) >= 1
    assert cv["vision_metrics"]["cavity_area_pct"] > 0

    # Create repaired smooth asphalt surface
    img_after = Image.new("RGB", (640, 480), (108, 112, 118))
    buf_after = io.BytesIO()
    img_after.save(buf_after, format="JPEG", quality=92)
    after_bytes = buf_after.getvalue()

    comp = compare_before_after_repair(before_bytes, after_bytes)
    assert comp["compared"] is True
    assert comp["after_cavity_pct"] < comp["before_cavity_pct"]
    assert comp["requires_human_approval"] is True


def test_operations_analytics_and_detail_metrics(client):
    res = client.get("/api/incidents/analytics")
    assert res.status_code == 200
    data = res.json()
    assert data["total_incidents"] >= 15
    assert len(data["all_corridors"]) > 0
    assert len(data["divisions"]) > 0

    # Verify INF-1007 includes before/after repair evidence & comparison
    det = client.get("/api/incidents/INF-1007")
    assert det.status_code == 200
    detail = det.json()
    assert detail["after_repair_image_url"] is not None
    assert detail["resolution_comparison"] is not None
    assert detail["assessments"][0]["vision_metrics"]


