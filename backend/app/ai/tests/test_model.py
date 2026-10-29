"""Baseline independence and model lifecycle tests need no weights or torch."""

from concurrent.futures import ThreadPoolExecutor
from io import BytesIO
import subprocess
import sys
from time import sleep

import numpy as np
from PIL import Image
import pytest

from backend.app.ai import model, service
from backend.app.ai.benchmark import candidate_changes, peak_memory_mib


@pytest.fixture(autouse=True)
def isolated_loader(monkeypatch):
    monkeypatch.setattr(model, "_instance", None)
    monkeypatch.setattr(model, "_failure", None)
    monkeypatch.delenv("RESTORE_BACKEND", raising=False)


def png():
    stream = BytesIO()
    Image.fromarray(np.full((33, 35), 70, np.uint8)).save(stream, format="PNG")
    return stream.getvalue()


def test_baseline_does_not_import_optional_dependencies():
    script = '''
import sys
class BlockOptional:
    def find_spec(self, fullname, *args):
        if fullname.split('.')[0] in {'torch', 'torchvision', 'scipy'}:
            raise AssertionError('Optional dependency imported: ' + fullname)
sys.meta_path.insert(0, BlockOptional())
from backend.app.ai.tests.test_model import png
from backend.app.ai.service import restore_image
import os
os.environ['RESTORE_BACKEND'] = 'baseline'
assert restore_image(png())['model_name'] == 'opencv-nlmeans-unsharp-baseline'
os.environ['RESTORE_BACKEND'] = 'model'
assert restore_image(png())['model_name'] == 'opencv-nlmeans-unsharp-baseline'
'''
    result = subprocess.run([sys.executable, "-c", script], capture_output=True, text=True)
    assert result.returncode == 0, result.stderr


def test_load_once_under_concurrency(monkeypatch):
    calls = []
    sentinel = object()
    def load():
        calls.append(1)
        sleep(0.02)
        return sentinel
    monkeypatch.setattr(model, "_load_model", load)
    with ThreadPoolExecutor(max_workers=8) as pool:
        results = list(pool.map(lambda _: model.get_model(), range(20)))
    assert all(item is sentinel for item in results)
    assert len(calls) == 1


def test_load_failure_cached_and_falls_back(monkeypatch):
    calls = []
    def load():
        calls.append(1)
        raise ImportError("missing optional package")
    monkeypatch.setattr(model, "_load_model", load)
    monkeypatch.setenv("RESTORE_BACKEND", "model")
    for _ in range(2):
        result = service.restore_image(png())
        assert result["model_name"] == "opencv-nlmeans-unsharp-baseline"
        assert any("used the OpenCV baseline" in notice for notice in result["warnings"])
    assert len(calls) == 1


@pytest.mark.parametrize("failure", ["raise", "shape", "dtype", "mutate"])
def test_inference_failure_preserves_input(monkeypatch, failure):
    def predict(pixels):
        if failure == "mutate":
            pixels[:] = 0
        if failure in {"raise", "mutate"}:
            raise RuntimeError("inference failed")
        return pixels[:2] if failure == "shape" else pixels.astype(float)
    monkeypatch.setattr(model, "_load_model", lambda: predict)
    baseline = service.restore_image(png())
    monkeypatch.setenv("RESTORE_BACKEND", "model")
    result = service.restore_image(png())
    assert result["png_bytes"] == baseline["png_bytes"]
    assert result["model_name"] == baseline["model_name"]


def test_successful_optional_model_metadata(monkeypatch):
    def predict(pixels):
        return pixels
    predict.model_name = "test-only-identity"
    predict.model_license = "test-only"
    monkeypatch.setattr(model, "_load_model", lambda: predict)
    monkeypatch.setenv("RESTORE_BACKEND", "model")
    result = service.restore_image(png())
    assert result["model_name"] == "test-only-identity"
    assert result["model_license"] == "test-only"
    assert (result["width"], result["height"]) == (35, 33)
    assert result["warnings"] == [service.RESTORE_WARNING]


def test_unqualified_model_cannot_load(monkeypatch):
    monkeypatch.setattr(model, "MODEL_QUALIFIED", False)
    with pytest.raises(RuntimeError, match="release gates"):
        model.get_model()


def test_unknown_backend_falls_back(monkeypatch):
    monkeypatch.setenv("RESTORE_BACKEND", "unknown")
    result = service.restore_image(png())
    assert result["model_name"] == "opencv-nlmeans-unsharp-baseline"
    assert "Unknown RESTORE_BACKEND" in result["warnings"][-1]


def test_candidate_matching_is_one_to_one():
    result = candidate_changes([{"x": 1, "y": 1}, {"x": 1.1, "y": 1}], [{"x": 1, "y": 1}])
    assert result["matched_within_2px"] == 1
    assert result["unmatched_input_candidates"] == 1
    assert result["unmatched_output_candidates"] == 0
    assert peak_memory_mib() > 0


def test_rl_preserves_constant_channels_and_shape():
    pytest.importorskip("scipy")
    from backend.app.ai.restore_rl import restore
    pixels = np.full((33, 35, 3), [30, 100, 200], np.uint8)
    original = pixels.copy()
    result = restore(pixels)
    np.testing.assert_array_equal(result, original)
    np.testing.assert_array_equal(pixels, original)
