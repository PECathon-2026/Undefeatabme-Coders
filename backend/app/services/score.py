SCORE_METHOD = (
    "v1: 0.6*clear_sky + 0.2*dryness + 0.2*visibility(capped 20 km); "
    "weights 0.75/0.25 if visibility is null; ignores moon and light pollution"
)


def calculate_night_honor_score(
    cloud_cover: float,
    humidity: float,
    visibility_km: float | None = None,
) -> int:
    """Calculate Night Honor Score (0-100) based on sky clarity and atmospheric transparency.

    Formula:
    - If visibility_km is provided:
        score = round(0.6 * (100 - cloud) + 0.2 * (100 - humidity) + 0.2 * min(vis_km, 20) / 20 * 100)
    - If visibility_km is None:
        score = round(0.75 * (100 - cloud) + 0.25 * (100 - humidity))
    Clamped to range 0..100.
    """
    cloud = max(0.0, min(100.0, float(cloud_cover)))
    hum = max(0.0, min(100.0, float(humidity)))

    if visibility_km is not None:
        vis = max(0.0, float(visibility_km))
        vis_score = (min(vis, 20.0) / 20.0) * 100.0
        raw_score = 0.6 * (100.0 - cloud) + 0.2 * (100.0 - hum) + 0.2 * vis_score
    else:
        raw_score = 0.75 * (100.0 - cloud) + 0.25 * (100.0 - hum)

    score = round(raw_score)
    return max(0, min(100, score))
