"""Optional point-source candidate detector; never downloads catalogue data."""

import warnings

import cv2
import numpy as np

FWHM_PX = 4.0  # Assumed image-space width, not a calibrated PSF.


def detect(pixels: np.ndarray) -> list[dict]:
    # Lazy imports keep the core backend usable without optional packages.
    from astropy.stats import sigma_clipped_stats
    from photutils.detection import DAOStarFinder
    from photutils.utils.exceptions import NoDetectionsWarning

    gray = pixels.astype(np.float32) / 255.0
    if gray.ndim == 3:
        gray = cv2.cvtColor(gray, cv2.COLOR_RGB2GRAY)
    residual = gray - cv2.GaussianBlur(gray, (0, 0), 10.0)
    _, median, sigma = sigma_clipped_stats(
        residual, sigma=3.0, maxiters=5, cenfunc="median", stdfunc="mad_std",
    )
    if not np.isfinite(median) or not np.isfinite(sigma):
        raise ValueError("Non-finite background estimate")
    residual = residual - float(median)
    # One 8-bit intensity step avoids a zero threshold on quantized flat fields.
    threshold = max(5.0 * float(sigma), 1.0 / 255.0)
    if float(residual.max()) <= threshold:
        return []
    finder = DAOStarFinder(threshold=threshold, fwhm=FWHM_PX, exclude_border=False)
    with warnings.catch_warnings():
        warnings.simplefilter("ignore", NoDetectionsWarning)
        table = finder(residual)
    if table is None or len(table) == 0:
        return []

    height, width = gray.shape
    radius = int(np.ceil(2 * FWHM_PX))
    candidates = []
    for row in table:
        x, y = float(row["x_centroid"]), float(row["y_centroid"])
        if not np.isfinite(x) or not np.isfinite(y) or not (0 <= x < width and 0 <= y < height):
            continue
        ix, iy = min(int(np.floor(x + 0.5)), width - 1), min(int(np.floor(y + 0.5)), height - 1)
        x0, x1 = max(0, ix-radius), min(width, ix+radius+1)
        y0, y1 = max(0, iy-radius), min(height, iy+radius+1)
        support = (residual[y0:y1, x0:x1] > threshold).astype(np.uint8)
        _, labels, stats, _ = cv2.connectedComponentsWithStats(support, connectivity=8)
        label = int(labels[iy-y0, ix-x0])
        if label == 0:
            sy, sx = np.nonzero(support)
            if not len(sx):
                continue
            distances = (sx+x0-x)**2 + (sy+y0-y)**2
            nearest = int(np.argmin(distances))
            if distances[nearest] > 4.0:
                continue
            label = int(labels[sy[nearest], sx[nearest]])
        area = int(stats[label, cv2.CC_STAT_AREA])
        if area < 2:
            continue
        # DAO's peak/flux are background-subtracted. Return an ORIGINAL gray
        # pixel peak and a threshold-support equivalent diameter instead.
        peak = float(gray[y0:y1, x0:x1][labels == label].max())
        candidates.append({"x": x, "y": y, "peak_brightness": peak,
                           "approx_size_px": float(2 * np.sqrt(area / np.pi))})
    candidates.sort(key=lambda source: (-source["peak_brightness"], source["y"], source["x"]))
    return [{"id": index, **source} for index, source in enumerate(candidates[:200], 1)]
