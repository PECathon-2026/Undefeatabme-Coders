"""Fixed Python interface used by backend routes; no disk I/O."""

from io import BytesIO
import os
from time import perf_counter

from PIL import Image

from .detect import detect
from .restore_baseline import restore
from .validation import ImageValidationError, validate_image

RESTORE_WARNING = "Restored image is an algorithmic enhancement, not new data. Features may be artefacts."
DETECT_WARNING = "Detections are candidates, not confirmed astronomical objects."

__all__ = ["ImageValidationError", "restore_image", "detect_sources"]


def restore_image(data: bytes) -> dict:
    start = perf_counter()
    pixels, notices = validate_image(data)
    model_name = "opencv-nlmeans-unsharp-baseline"
    model_license = "Apache-2.0 (OpenCV)"
    selection = os.environ.get("RESTORE_BACKEND", "baseline").strip().lower()
    if selection == "model":
        try:
            from .model import restore as restore_model
            restored, model_name, model_license = restore_model(pixels)
        except Exception:
            notices.append("Optional model unavailable or not qualified; used the OpenCV baseline.")
            restored = restore(pixels)
    else:
        if selection != "baseline":
            notices.append("Unknown RESTORE_BACKEND; used the OpenCV baseline.")
        restored = restore(pixels)
    output = BytesIO()
    Image.fromarray(restored).save(output, format="PNG")
    return {"png_bytes": output.getvalue(), "width": int(pixels.shape[1]),
            "height": int(pixels.shape[0]), "model_name": model_name,
            "model_license": model_license,
            "runtime_ms": int((perf_counter() - start) * 1000),
            "warnings": [RESTORE_WARNING, *notices]}


def detect_sources(data: bytes) -> dict:
    pixels, notices = validate_image(data)
    sources = detect(pixels)
    return {"image_width": int(pixels.shape[1]), "image_height": int(pixels.shape[0]),
            "method": "opencv-threshold-centroid", "count": len(sources),
            "sources": sources, "warnings": [DETECT_WARNING, *notices]}
