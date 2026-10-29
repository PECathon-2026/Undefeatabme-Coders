import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app, raise_server_exceptions=False)


def test_health_check() -> None:
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_cors_headers_allowed() -> None:
    response = client.options(
        "/api/health",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == "http://localhost:5173"


def test_404_error_shape() -> None:
    response = client.get("/api/nonexistent")
    assert response.status_code == 404
    data = response.json()
    assert "error" in data
    assert data["error"]["code"] == "not_found"
    assert "message" in data["error"]


def test_validation_error_shape() -> None:
    @app.get("/_test_validation_error")
    def sample_endpoint(param: int) -> dict[str, int]:
        return {"param": param}

    response = client.get("/_test_validation_error?param=not_an_int")
    assert response.status_code == 422
    data = response.json()
    assert "error" in data
    assert data["error"]["code"] == "invalid_parameter"
    assert "message" in data["error"]
    assert "param" in data["error"]["message"]


def test_internal_server_error_shape() -> None:
    @app.get("/_test_internal_error")
    def failing_endpoint() -> None:
        raise RuntimeError("Something went wrong internally")

    response = client.get("/_test_internal_error")
    assert response.status_code == 500
    data = response.json()
    assert data == {
        "error": {
            "code": "internal_error",
            "message": "An unexpected internal server error occurred.",
        }
    }

