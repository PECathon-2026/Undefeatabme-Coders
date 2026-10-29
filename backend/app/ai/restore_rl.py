"""Optional evaluation-only Richardson-Lucy with an assumed Gaussian PSF."""

import numpy as np


def restore(pixels: np.ndarray, iterations: int = 10, sigma: float = 1.0) -> np.ndarray:
    from scipy.ndimage import gaussian_filter

    if iterations < 1 or sigma <= 0:
        raise ValueError("Positive iteration count and PSF sigma required")
    observed = pixels.astype(np.float32) / 255
    estimate = np.maximum(observed, 1e-6)
    axes_sigma = (sigma, sigma) if pixels.ndim == 2 else (sigma, sigma, 0)
    # A symmetric Gaussian equals its flipped PSF. Reflect at boundaries;
    # channels are independent. The PSF is assumed, never calibrated.
    for _ in range(iterations):
        predicted = gaussian_filter(estimate, axes_sigma, mode="reflect")
        ratio = observed / np.maximum(predicted, 1e-6)
        estimate *= gaussian_filter(ratio, axes_sigma, mode="reflect")
    return np.rint(np.clip(estimate, 0, 1) * 255).astype(np.uint8)
