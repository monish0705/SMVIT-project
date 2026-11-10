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

