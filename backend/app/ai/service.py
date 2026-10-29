"""Fixed Python interface used by backend routes; no disk I/O."""

from io import BytesIO
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
    output = BytesIO()
    Image.fromarray(restore(pixels)).save(output, format="PNG")
    return {"png_bytes": output.getvalue(), "width": int(pixels.shape[1]),
            "height": int(pixels.shape[0]), "model_name": "opencv-nlmeans-unsharp-baseline",
            "model_license": "Apache-2.0 (OpenCV)",
            "runtime_ms": int((perf_counter() - start) * 1000),
            "warnings": [RESTORE_WARNING, *notices]}


def detect_sources(data: bytes) -> dict:
    pixels, notices = validate_image(data)
    sources = detect(pixels)
    return {"image_width": int(pixels.shape[1]), "image_height": int(pixels.shape[0]),
            "method": "opencv-threshold-centroid", "count": len(sources),
            "sources": sources, "warnings": [DETECT_WARNING, *notices]}
