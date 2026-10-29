from io import BytesIO
import struct
import zlib

import numpy as np
import pytest
from PIL import Image

from backend.app.ai.service import (
    DETECT_WARNING, RESTORE_WARNING, ImageValidationError, detect_sources, restore_image,
)
from backend.app.ai.validation import MAX_BYTES, validate_image


def encode(array, fmt="PNG"):
    buffer = BytesIO()
    Image.fromarray(array).save(buffer, format=fmt)
    return buffer.getvalue()


@pytest.fixture
def stars():
    rng = np.random.default_rng(42)
    y, x = np.mgrid[:192, :256]
    pixels = rng.normal(0.12, 0.008, x.shape)
    positions = [(45.3, 61.7), (127.4, 101.2), (208.6, 145.5)]
    for amplitude, (cx, cy) in zip([0.8, 0.65, 0.5], positions):
        pixels += amplitude * np.exp(-((x - cx)**2 + (y - cy)**2) / (2 * 2.0**2))
    return np.rint(np.clip(pixels, 0, 1) * 255).astype(np.uint8), positions


def test_known_candidate_positions(stars):
    pixels, positions = stars
    result = detect_sources(encode(pixels))
    assert set(result) == {"image_width", "image_height", "method", "count", "sources", "warnings"}
    assert result["method"] == "opencv-threshold-centroid"
    assert result["count"] == len(positions)
    assert result["warnings"] == [DETECT_WARNING]
    assert (result["image_width"], result["image_height"]) == (256, 192)
    peaks = [s["peak_brightness"] for s in result["sources"]]
    assert peaks == sorted(peaks, reverse=True)
    for source, (x, y) in zip(result["sources"], positions):
        assert np.hypot(source["x"] - x, source["y"] - y) < 2
        assert 0 <= source["peak_brightness"] <= 1
        assert source["approx_size_px"] > 0
        assert set(source) == {"id", "x", "y", "peak_brightness", "approx_size_px"}


@pytest.mark.parametrize("fmt", ["PNG", "JPEG"])
@pytest.mark.parametrize("color", [False, True])
def test_restore_dimensions_and_original(stars, fmt, color):
    pixels, _ = stars
    if color:
        pixels = np.repeat(pixels[..., None], 3, axis=2)
    data = encode(pixels, fmt)
    original = bytes(data)
    result = restore_image(data)
    assert set(result) == {"png_bytes", "width", "height", "model_name", "model_license", "runtime_ms", "warnings"}
    assert (result["width"], result["height"]) == (256, 192)
    with Image.open(BytesIO(result["png_bytes"])) as image:
        assert image.size == (256, 192)
        assert image.format == "PNG"
    assert data == original
    assert result["warnings"] == [RESTORE_WARNING]
    assert result["runtime_ms"] >= 0


@pytest.mark.parametrize("service", [restore_image, detect_sources])
@pytest.mark.parametrize("data,code", [
    (b"", "invalid_image"), (b"not an image", "invalid_image"),
    (b"SIMPLE  =" + b" " * 80, "unsupported_type"),
    (b"x" * (MAX_BYTES + 1), "file_too_large"),
])
def test_invalid_uploads(service, data, code):
    with pytest.raises(ImageValidationError) as error:
        service(data)
    assert error.value.code == code


@pytest.mark.parametrize("service", [restore_image, detect_sources])
@pytest.mark.parametrize("shape", [(31, 64), (64, 31), (2049, 32), (32, 2049)])
def test_dimension_limits(service, shape):
    with pytest.raises(ImageValidationError) as error:
        service(encode(np.zeros(shape, np.uint8)))
    assert error.value.code == "image_too_large"


@pytest.mark.parametrize("fmt", ["GIF", "BMP", "TIFF"])
def test_unsupported_formats(fmt):
    with pytest.raises(ImageValidationError) as error:
        detect_sources(encode(np.zeros((32, 32), np.uint8), fmt))
    assert error.value.code == "unsupported_type"


def test_corrupt_png():
    data = encode(np.zeros((32, 32), np.uint8))
    with pytest.raises(ImageValidationError) as error:
        restore_image(data[:40])
    assert error.value.code == "invalid_image"


def test_decompression_bomb_header():
    data = bytearray(encode(np.zeros((32, 32), np.uint8)))
    data[16:24] = struct.pack(">II", 100000, 100000)
    data[29:33] = struct.pack(">I", zlib.crc32(data[12:29]))
    with pytest.raises(ImageValidationError) as error:
        detect_sources(bytes(data))
    assert error.value.code == "image_too_large"


def test_sixteen_bit_scaling():
    pixels = np.tile(np.array([0, 257, 32768, 65535], dtype=np.uint16), (32, 8))
    data = encode(pixels)
    decoded, notices = validate_image(data)
    assert decoded[0, :4].tolist() == [0, 1, 128, 255]
    assert "16-bit" in notices[0]
    assert len(restore_image(data)["warnings"]) == 2
    assert len(detect_sources(data)["warnings"]) == 2


def test_flat_image_and_single_pixel_rejected():
    pixels = np.full((64, 64), 30, np.uint8)
    assert detect_sources(encode(pixels))["count"] == 0
    pixels[32, 32] = 255
    assert detect_sources(encode(pixels))["count"] == 0


def test_source_cap():
    pixels = np.zeros((512, 512), np.uint8)
    for y in range(16, 500, 24):
        for x in range(16, 500, 24):
            pixels[y:y+2, x:x+2] = 200
    result = detect_sources(encode(pixels))
    assert result["count"] == 200
    assert [s["id"] for s in result["sources"]] == list(range(1, 201))


def test_inclusive_dimensions():
    for shape in [(32, 32), (2048, 32), (32, 2048)]:
        pixels, _ = validate_image(encode(np.zeros(shape, np.uint8)))
        assert pixels.shape == shape
