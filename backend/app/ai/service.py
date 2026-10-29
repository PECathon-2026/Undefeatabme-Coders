"""Fixed Python interface used by backend routes; no disk I/O."""

from io import BytesIO
import os
from time import perf_counter

import cv2
import numpy as np
from PIL import Image

from .detect import detect_candidates
from .restore_baseline import restore
from .validation import ImageValidationError, validate_image

RESTORE_WARNING = "Restored image is an algorithmic enhancement, not new data. Features may be artefacts."
DETECT_WARNING = "Detections are candidates, not confirmed astronomical objects."
MAX_PROCESSING_SECONDS = 30.0


class _ProcessingTimeoutError(RuntimeError):
    pass


def _check_processing_time(start: float) -> None:
    if perf_counter() - start > MAX_PROCESSING_SECONDS:
        raise _ProcessingTimeoutError("Image processing exceeded the 30-second limit.")


def _restore_baseline(pixels: np.ndarray) -> np.ndarray:
    try:
        return restore(pixels)
    except (cv2.error, MemoryError) as exc:
        raise RuntimeError("OpenCV restoration failed while processing the image.") from exc


__all__ = ["ImageValidationError", "restore_image", "detect_sources"]


def restore_image(data: bytes) -> dict:
    start = perf_counter()
    pixels, notices = validate_image(data)
    _check_processing_time(start)
    model_name = "opencv-nlmeans-unsharp-baseline"
    model_license = "Apache-2.0 (OpenCV)"
    selection = os.environ.get("RESTORE_BACKEND", "baseline").strip().lower()
    if selection == "model":
        try:
            from .model import restore as restore_model
            restored, model_name, model_license = restore_model(pixels)
            _check_processing_time(start)
        except _ProcessingTimeoutError:
            raise
        except Exception:
            notices.append("Optional model unavailable or not qualified; used the OpenCV baseline.")
            restored = _restore_baseline(pixels)
    else:
        if selection != "baseline":
            notices.append("Unknown RESTORE_BACKEND; used the OpenCV baseline.")
        restored = _restore_baseline(pixels)
    _check_processing_time(start)
    try:
        output = BytesIO()
        Image.fromarray(restored).save(output, format="PNG")
        png_bytes = output.getvalue()
    except (OSError, TypeError, ValueError, MemoryError) as exc:
        raise RuntimeError("Restored image could not be encoded as PNG.") from exc
    _check_processing_time(start)
    return {"png_bytes": png_bytes, "width": int(pixels.shape[1]),
            "height": int(pixels.shape[0]), "model_name": model_name,
            "model_license": model_license,
            "runtime_ms": int((perf_counter() - start) * 1000),
            "warnings": [RESTORE_WARNING, *notices]}


def detect_sources(data: bytes) -> dict:
    start = perf_counter()
    pixels, notices = validate_image(data)
    _check_processing_time(start)
    try:
        sources, method, detector_notices = detect_candidates(pixels)
    except (cv2.error, MemoryError) as exc:
        raise RuntimeError("OpenCV source detection failed while processing the image.") from exc
    _check_processing_time(start)
    return {"image_width": int(pixels.shape[1]), "image_height": int(pixels.shape[0]),
            "method": method, "count": len(sources),
            "sources": sources, "warnings": [DETECT_WARNING, *notices, *detector_notices]}
