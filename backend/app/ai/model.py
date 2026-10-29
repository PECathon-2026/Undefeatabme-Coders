"""Optional lazy model lifecycle. Imports no torch during baseline operation."""

import os
from threading import Lock

import numpy as np

# Only change after the documented licence, latency and artefact gates pass.
MODEL_QUALIFIED = False
_lock = Lock()
_instance = None
_failure = None


def _load_model():
    if not MODEL_QUALIFIED:
        raise RuntimeError("No pretrained model has passed the A2 release gates")
    from .model_eval import create_predictor

    path = os.environ.get("RESTORE_MODEL_PATH")
    if not path:
        raise RuntimeError("RESTORE_MODEL_PATH is required")
    return create_predictor(path)


def get_model():
    """Load once per process, including caching failures until restart."""
    global _instance, _failure
    with _lock:
        if _failure is not None:
            raise RuntimeError("Optional model unavailable") from _failure
        if _instance is None:
            try:
                _instance = _load_model()
            except Exception as exc:
                _failure = exc
                raise
        return _instance


def restore(pixels):
    predictor = get_model()
    result = predictor(pixels.copy())
    if not isinstance(result, np.ndarray) or result.shape != pixels.shape or result.dtype != np.uint8:
        raise RuntimeError("Optional model returned an invalid image")
    return result, predictor.model_name, predictor.model_license
