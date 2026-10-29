"""Gentle full-resolution denoising followed by mild sharpening."""

import cv2
import numpy as np


def restore(pixels: np.ndarray) -> np.ndarray:
    # A small search window bounds CPU cost without resizing the image.
    if pixels.ndim == 2:
        denoised = cv2.fastNlMeansDenoising(pixels, None, 3, 3, 7)
    else:
        bgr = cv2.cvtColor(pixels, cv2.COLOR_RGB2BGR)
        denoised = cv2.fastNlMeansDenoisingColored(bgr, None, 3, 3, 3, 7)
        denoised = cv2.cvtColor(denoised, cv2.COLOR_BGR2RGB)
    blurred = cv2.GaussianBlur(denoised, (0, 0), 1.0)
    return cv2.addWeighted(denoised, 1.15, blurred, -0.15, 0)
