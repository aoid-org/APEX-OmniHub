from fastapi import FastAPI
from fastapi.testclient import TestClient

from omniboard.router import router

app = FastAPI()
app.include_router(router)

client = TestClient(app)


def test_router_lifecycle():
    """Verify disconnect and rotate endpoints."""
    # these are mock endpoints, just checking 200 OK

    resp = client.delete("/omniboard/connection/conn_123")
    assert resp.status_code == 200
    assert resp.json()["status"] == "disconnected"

    resp = client.post("/omniboard/connection/conn_123/rotate")
    assert resp.status_code == 200
    assert resp.json()["status"] == "rotated"
