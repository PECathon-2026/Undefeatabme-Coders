"""Threshold residuals to locate candidate sources in original pixel coordinates."""

import os

import cv2
import numpy as np

OPENCV_METHOD = "opencv-threshold-centroid"
PHOTUTILS_METHOD = "photutils-daostarfinder"


def detect_candidates(pixels: np.ndarray) -> tuple[list[dict], str, list[str]]:
    """Select an optional detector without changing the fixed API schema."""
    selection = os.environ.get("DETECT_BACKEND", "opencv").strip().lower()
    notices = []
    if selection == "photutils":
        try:
            from .detect_photutils import detect as detect_optional
            sources = detect_optional(pixels.copy())
            return sources, PHOTUTILS_METHOD, notices
        except Exception:
            notices.append("Optional Photutils detector unavailable or failed; used the OpenCV detector.")
    elif selection != "opencv":
        notices.append("Unknown DETECT_BACKEND; used the OpenCV detector.")
    return detect(pixels), OPENCV_METHOD, notices


def detect(pixels: np.ndarray) -> list[dict]:
    gray = pixels.astype(np.float32) / 255.0
    if gray.ndim == 3:
        gray = cv2.cvtColor(gray, cv2.COLOR_RGB2GRAY)
    residual = gray - cv2.GaussianBlur(gray, (0, 0), 10.0)
    median = float(np.median(residual))
    sigma = 1.4826 * float(np.median(np.abs(residual - median)))
    mask = (residual > median + max(5 * sigma, 1e-6)).astype(np.uint8)
    count, labels, stats, _ = cv2.connectedComponentsWithStats(mask, connectivity=8)
    # Aggregate all components in one pass, avoiding an image scan per blob.
    ys, xs = np.nonzero(mask)
    groups = labels[ys, xs]
    weights = np.maximum(residual[ys, xs], 0).astype(np.float64)
    totals = np.bincount(groups, weights=weights, minlength=count)
    x_moments = np.bincount(groups, weights=weights * xs, minlength=count)
    y_moments = np.bincount(groups, weights=weights * ys, minlength=count)
    peaks = np.zeros(count, dtype=np.float32)
    np.maximum.at(peaks, groups, gray[ys, xs])
    eligible = [i for i in range(1, count) if stats[i, cv2.CC_STAT_AREA] >= 2 and totals[i] > 0]
    eligible.sort(key=lambda i: (-float(peaks[i]), i))
    return [
        {"id": rank, "x": float(x_moments[i] / totals[i]),
         "y": float(y_moments[i] / totals[i]), "peak_brightness": float(peaks[i]),
         "approx_size_px": float(2 * np.sqrt(stats[i, cv2.CC_STAT_AREA] / np.pi))}
        for rank, i in enumerate(eligible[:200], 1)
    ]
