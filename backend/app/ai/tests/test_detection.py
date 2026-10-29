"""Optional detector accuracy, contract mapping, and core-only fallback."""

from io import BytesIO
import json
import subprocess
import sys

import cv2
import numpy as np
from PIL import Image
import pytest

from backend.app.ai import detect_photutils
from backend.app.ai.detect import OPENCV_METHOD, PHOTUTILS_METHOD
from backend.app.ai.service import DETECT_WARNING, ImageValidationError, detect_sources


def encode(pixels):
    stream = BytesIO()
    Image.fromarray(pixels).save(stream, format="PNG")
    return stream.getvalue()


def star_field(sigma=2.0, color=False):
    y, x = np.mgrid[:180, :240]
    points = [(31.2, 47.6), (119.7, 92.3), (201.4, 142.8)]
    values = np.random.default_rng(60).normal(0.1, 0.006, x.shape)
    values += x / 240 * 0.08
    for amplitude, (cx, cy) in zip([0.75, 0.5, 0.3], points):
        values += amplitude * np.exp(-((x-cx)**2 + (y-cy)**2) / (2*sigma**2))
    pixels = np.rint(np.clip(values, 0, 1)*255).astype(np.uint8)
    return (np.repeat(pixels[..., None], 3, axis=2) if color else pixels), points


@pytest.fixture(autouse=True)
def default_backend(monkeypatch):
    monkeypatch.delenv("DETECT_BACKEND", raising=False)


@pytest.fixture
def optional_dependencies():
    pytest.importorskip("photutils")
    pytest.importorskip("astropy")


@pytest.mark.parametrize("sigma", [1.3, 2.0, 2.5])
@pytest.mark.parametrize("color", [False, True])
def test_photutils_positions_and_contract(optional_dependencies, monkeypatch, sigma, color):
    monkeypatch.setenv("DETECT_BACKEND", "photutils")
    pixels, positions = star_field(sigma, color)
    data = encode(pixels)
    result = detect_sources(data)
    assert result["method"] == PHOTUTILS_METHOD  # Must not silently test fallback.
    assert result["count"] == len(positions)
    assert result["warnings"] == [DETECT_WARNING]
    assert (result["image_width"], result["image_height"]) == (240, 180)
    assert set(result) == {"image_width", "image_height", "method", "count", "sources", "warnings"}
    assert [s["id"] for s in result["sources"]] == [1, 2, 3]
    gray = cv2.cvtColor(pixels, cv2.COLOR_RGB2GRAY) if color else pixels
    for source, (x, y) in zip(result["sources"], positions):
        assert np.hypot(source["x"]-x, source["y"]-y) < 2
        assert set(source) == {"id", "x", "y", "peak_brightness", "approx_size_px"}
        assert all(np.isfinite(value) for value in source.values())
        assert 0 <= source["peak_brightness"] <= 1
        ix, iy = round(x), round(y)
        assert source["peak_brightness"] == pytest.approx(gray[iy-3:iy+4, ix-3:ix+4].max()/255, abs=1e-6)
        assert 1 < source["approx_size_px"] < 20
    assert data == encode(pixels)
    json.dumps(result, allow_nan=False)


@pytest.mark.parametrize("value", [0, 80, 255])
def test_flat_fields(optional_dependencies, monkeypatch, value):
    monkeypatch.setenv("DETECT_BACKEND", "photutils")
    result = detect_sources(encode(np.full((64, 64), value, np.uint8)))
    assert result["method"] == PHOTUTILS_METHOD
    assert result["sources"] == []


def test_single_hot_pixel_rejected(optional_dependencies, monkeypatch):
    pixels = np.full((64, 64), 30, np.uint8)
    pixels[32, 32] = 255
    monkeypatch.setenv("DETECT_BACKEND", "photutils")
    result = detect_sources(encode(pixels))
    assert result["method"] == PHOTUTILS_METHOD
    assert result["count"] == 0


def test_brightest_200(optional_dependencies):
    y, x = np.mgrid[:384, :384]
    pixels = np.random.default_rng(1).normal(0.08, 0.002, x.shape)
    for index, (cy, cx) in enumerate((cy, cx) for cy in range(12, 375, 24) for cx in range(12, 375, 24)):
        pixels += (0.3 + index / 1000) * np.exp(-((x-cx)**2+(y-cy)**2)/4.5)
    sources = detect_photutils.detect(np.rint(pixels*255).astype(np.uint8))
    assert len(sources) == 200
    peaks = [source["peak_brightness"] for source in sources]
    assert peaks == sorted(peaks, reverse=True)
    assert [source["id"] for source in sources] == list(range(1, 201))


@pytest.mark.parametrize("error", [ImportError, RuntimeError])
def test_optional_failure_falls_back_without_mutating(monkeypatch, error):
    pixels, _ = star_field()
    baseline = detect_sources(encode(pixels))
    def fail(image):
        image[:] = 0
        raise error("private failure detail")
    monkeypatch.setattr(detect_photutils, "detect", fail)
    monkeypatch.setenv("DETECT_BACKEND", "photutils")
    result = detect_sources(encode(pixels))
    assert result["method"] == OPENCV_METHOD
    assert result["sources"] == baseline["sources"]
    assert result["warnings"][0] == DETECT_WARNING
    assert "used the OpenCV detector" in result["warnings"][-1]
    assert "private failure detail" not in str(result)


def test_no_candidates_is_not_a_failure(monkeypatch):
    monkeypatch.setattr(detect_photutils, "detect", lambda pixels: [])
    monkeypatch.setenv("DETECT_BACKEND", "photutils")
    result = detect_sources(encode(star_field()[0]))
    assert result["method"] == PHOTUTILS_METHOD
    assert result["sources"] == []
    assert result["warnings"] == [DETECT_WARNING]


def test_unknown_backend(monkeypatch):
    monkeypatch.setenv("DETECT_BACKEND", "typo")
    result = detect_sources(encode(star_field()[0]))
    assert result["method"] == OPENCV_METHOD
    assert "Unknown DETECT_BACKEND" in result["warnings"][-1]


@pytest.mark.parametrize("selection", ["opencv", "photutils"])
def test_invalid_input_precedes_detection(monkeypatch, selection):
    monkeypatch.setenv("DETECT_BACKEND", selection)
    def forbidden(_):
        pytest.fail("Invalid bytes reached optional detector")
    monkeypatch.setattr(detect_photutils, "detect", forbidden)
    with pytest.raises(ImageValidationError) as error:
        detect_sources(b"bad input")
    assert error.value.code == "invalid_image"


def test_missing_packages_in_fresh_process():
    script = '''
import sys, os
from io import BytesIO
import numpy as np
from PIL import Image
class BlockOptional:
    def find_spec(self, fullname, *args):
        if fullname.split('.')[0] in {'photutils', 'astropy', 'scipy'}:
            raise ImportError('Optional packages deliberately blocked')
sys.meta_path.insert(0, BlockOptional())
from backend.app.ai.service import detect_sources
stream = BytesIO()
Image.fromarray(np.full((32, 32), 80, np.uint8)).save(stream, format='PNG')
os.environ['DETECT_BACKEND'] = 'opencv'
assert len(detect_sources(stream.getvalue())['warnings']) == 1
os.environ['DETECT_BACKEND'] = 'photutils'
result = detect_sources(stream.getvalue())
assert result['method'] == 'opencv-threshold-centroid'
assert len(result['warnings']) == 2
'''
    result = subprocess.run([sys.executable, "-c", script], capture_output=True, text=True)
    assert result.returncode == 0, result.stderr
