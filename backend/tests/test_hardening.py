import os
from io import BytesIO
from unittest.mock import patch
from PIL import Image
import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.routes.image import clear_rate_limiter
from backend.app.schemas import ErrorResponse, RestoreResponse

client = TestClient(app, raise_server_exceptions=False)


@pytest.fixture(autouse=True)
def reset_limiter() -> None:
    clear_rate_limiter()
    yield
    clear_rate_limiter()


def create_in_memory_image(width: int, height: int, fmt: str = "PNG") -> bytes:
    buf = BytesIO()
    img = Image.new("RGB", (width, height), color=(20, 30, 40))
    img.save(buf, format=fmt)
    return buf.getvalue()


def test_cors_production_origin_header() -> None:
    prod_origin = "http://localhost:5173"
    response = client.options(
        "/api/health",
        headers={
            "Origin": prod_origin,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "Content-Type",
        },
    )
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == prod_origin
    assert "POST" in response.headers.get("access-control-allow-methods", "")


def test_cors_disallowed_origin() -> None:
    unauthorized_origin = "https://malicious-site.example.com"
    response = client.options(
        "/api/health",
        headers={
            "Origin": unauthorized_origin,
            "Access-Control-Request-Method": "GET",
        },
    )
    assert response.headers.get("access-control-allow-origin") != unauthorized_origin


def test_error_shape_on_method_not_allowed() -> None:
    response = client.delete("/api/health")
    assert response.status_code == 405
    data = response.json()
    model = ErrorResponse.model_validate(data)
    assert model.error.code == "method_not_allowed"
    assert len(model.error.message) > 0


def test_error_shape_on_not_found() -> None:
    response = client.get("/api/unknown-endpoint")
    assert response.status_code == 404
    data = response.json()
    model = ErrorResponse.model_validate(data)
    assert model.error.code == "not_found"
    assert len(model.error.message) > 0


def test_image_exact_minimum_boundary_32px() -> None:
    img_32px = create_in_memory_image(32, 32, "PNG")
    response = client.post(
        "/api/restore",
        files={"file": ("min.png", img_32px, "image/png")},
    )
    assert response.status_code == 200
    model = RestoreResponse.model_validate(response.json())
    assert model.width == 32
    assert model.height == 32


def test_image_empty_file_returns_422() -> None:
    response = client.post(
        "/api/restore",
        files={"file": ("empty.png", b"", "image/png")},
    )
    assert response.status_code == 422
    data = response.json()
    assert data["error"]["code"] == "invalid_image"


def test_events_boundary_empty_window() -> None:
    response = client.get("/api/events?type=meteor_shower&date=2099-01-01")
    assert response.status_code == 200
    data = response.json()
    assert data["query"]["date"] == "2099-01-01"
    assert isinstance(data["events"], list)


def test_restore_backend_defaults_to_baseline() -> None:
    img_32px = create_in_memory_image(32, 32, "PNG")
    with patch.dict(os.environ, {}, clear=False):
        os.environ.pop("RESTORE_BACKEND", None)
        response = client.post(
            "/api/restore",
            files={"file": ("test.png", img_32px, "image/png")},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["model_name"] == "opencv-nlmeans-unsharp-baseline"
