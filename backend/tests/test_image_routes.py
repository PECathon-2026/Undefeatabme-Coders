from io import BytesIO
from unittest.mock import patch
from PIL import Image
import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.routes.image import clear_rate_limiter
from backend.app.schemas import DetectSourcesResponse, RestoreResponse

client = TestClient(app, raise_server_exceptions=False)


@pytest.fixture(autouse=True)
def reset_limiter() -> None:
    clear_rate_limiter()
    yield
    clear_rate_limiter()


def create_test_image_bytes(width: int = 64, height: int = 64, fmt: str = "PNG") -> bytes:
    """Generate in-memory test image with Pillow without touching disk."""
    buf = BytesIO()
    img = Image.new("RGB", (width, height), color=(15, 25, 45))
    # Draw bright pixels if within bounds to ensure candidate detection has signals
    if width > 33 and height > 33:
        img.putpixel((32, 32), (255, 255, 255))
        img.putpixel((33, 32), (255, 255, 255))
    img.save(buf, format=fmt)
    return buf.getvalue()


def test_restore_image_valid_png() -> None:
    img_bytes = create_test_image_bytes(64, 64, "PNG")
    response = client.post(
        "/api/restore",
        files={"file": ("sample.png", img_bytes, "image/png")},
    )
    assert response.status_code == 200
    data = response.json()
    model = RestoreResponse.model_validate(data)

    assert model.width == 64
    assert model.height == 64
    assert model.restored_image.startswith("data:image/png;base64,")
    assert model.data_kind == "computed"
    assert model.model_name == "opencv-nlmeans-unsharp-baseline"
    assert "algorithmic enhancement" in model.warnings[0].lower()


def test_detect_objects_valid_png() -> None:
    img_bytes = create_test_image_bytes(64, 64, "PNG")
    response = client.post(
        "/api/detect-objects",
        files={"file": ("sample.png", img_bytes, "image/png")},
    )
    assert response.status_code == 200
    data = response.json()
    model = DetectSourcesResponse.model_validate(data)

    assert model.image_width == 64
    assert model.image_height == 64
    assert model.method == "opencv-threshold-centroid"
    assert model.data_kind == "computed"
    assert "candidates" in model.warnings[0].lower()


def test_corrupted_bytes_returns_422() -> None:
    corrupt_data = b"NOT_A_VALID_IMAGE_HEADER_OR_DATA"
    response = client.post(
        "/api/restore",
        files={"file": ("corrupt.png", corrupt_data, "image/png")},
    )
    assert response.status_code == 422
    data = response.json()
    assert data["error"]["code"] == "invalid_image"


def test_unsupported_file_type_fits_returns_415() -> None:
    fits_header = b"SIMPLE  =                    T / file does conform to FITS standard"
    response = client.post(
        "/api/restore",
        files={"file": ("stars.fits", fits_header, "application/octet-stream")},
    )
    assert response.status_code == 415
    data = response.json()
    assert data["error"]["code"] == "unsupported_type"
    assert "FITS" in data["error"]["message"] or "JPEG" in data["error"]["message"]


def test_image_dimension_too_large_returns_422() -> None:
    # Dimension > 2048 px
    too_large = create_test_image_bytes(2049, 64, "PNG")
    response = client.post(
        "/api/restore",
        files={"file": ("oversize.png", too_large, "image/png")},
    )
    assert response.status_code == 422
    data = response.json()
    assert data["error"]["code"] == "image_too_large"


def test_image_dimension_too_small_returns_422() -> None:
    # Dimension < 32 px
    too_small = create_test_image_bytes(16, 16, "PNG")
    response = client.post(
        "/api/detect-objects",
        files={"file": ("undersize.png", too_small, "image/png")},
    )
    assert response.status_code == 422
    data = response.json()
    assert data["error"]["code"] == "image_too_large"


def test_payload_exceeding_10mb_returns_413() -> None:
    # 10 MB + 100 bytes
    huge_bytes = b"\x00" * (10 * 1024 * 1024 + 100)
    response = client.post(
        "/api/restore",
        files={"file": ("huge.png", huge_bytes, "image/png")},
    )
    assert response.status_code == 413
    data = response.json()
    assert data["error"]["code"] == "file_too_large"


def test_rate_limiter_blocks_eleventh_request() -> None:
    img_bytes = create_test_image_bytes(64, 64, "PNG")

    # Send 10 allowed requests
    for i in range(10):
        res = client.post(
            "/api/restore",
            files={"file": ("sample.png", img_bytes, "image/png")},
        )
        assert res.status_code == 200, f"Request {i+1} failed with status {res.status_code}"

    # 11th request must be rate limited (429)
    res_blocked = client.post(
        "/api/restore",
        files={"file": ("sample.png", img_bytes, "image/png")},
    )
    assert res_blocked.status_code == 429
    data = res_blocked.json()
    assert data["error"]["code"] == "rate_limited"


def test_missing_ai_service_returns_501() -> None:
    img_bytes = create_test_image_bytes(64, 64, "PNG")
    with patch.dict("sys.modules", {"backend.app.ai.service": None}):
        res = client.post(
            "/api/restore",
            files={"file": ("sample.png", img_bytes, "image/png")},
        )
        assert res.status_code == 501
        data = res.json()
        assert data["error"]["code"] == "not_implemented"
