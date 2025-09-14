from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["ok"] is True


def test_rewrite_plain():
    payload = {
        "prompt": "Explain WPA3 for Sec+ notes",
        "mode": "plain",
        "prefer_numbers": True,
    }
    r = client.post("/api/v1/rewrite", json=payload)
    assert r.status_code == 200
    data = r.json()
    assert "rewritten" in data
    assert data["score"] == 0.9
