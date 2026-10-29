import logging
import time
from typing import Any
import httpx
from backend.app.errors import APIError
from backend.app.schemas import LocationCoords, WeatherResponse
from backend.app.services.score import (
    SCORE_METHOD,
    calculate_night_honor_score,
)

logger = logging.getLogger("tsukuyomi.weather")

OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"
CACHE_TTL_SECONDS = 600.0  # 10 minutes

# Cache structure: (round_lat, round_lon) -> (WeatherResponse, expires_at)
_WEATHER_CACHE: dict[tuple[float, float], tuple[WeatherResponse, float]] = {}


def clear_weather_cache() -> None:
    """Clear in-memory weather cache (used in tests)."""
    _WEATHER_CACHE.clear()


def _format_iso_timestamp(current_time: str, utc_offset_seconds: int) -> str:
    """Format local time and UTC offset into an ISO-8601 string with offset."""
    sign = "+" if utc_offset_seconds >= 0 else "-"
    abs_seconds = abs(utc_offset_seconds)
    hours = abs_seconds // 3600
    minutes = (abs_seconds % 3600) // 60
    offset_str = f"{sign}{hours:02d}:{minutes:02d}"

    # Ensure seconds are included: YYYY-MM-DDTHH:MM -> YYYY-MM-DDTHH:MM:00
    formatted_time = current_time
    if len(current_time) == 16:
        formatted_time = f"{current_time}:00"

    return f"{formatted_time}{offset_str}"


def _find_matching_visibility(
    hourly: dict[str, Any], current_time: str
) -> float | None:
    """Find visibility matching current hour in metres and convert to km."""
    times: list[str] = hourly.get("time", [])
    visibilities: list[float | None] = hourly.get("visibility", [])

    if not times or not visibilities:
        return None

    # Current hour prefix e.g. "2026-10-30T21"
    hour_prefix = current_time[:13]
    for idx, t in enumerate(times):
        if t.startswith(hour_prefix) and idx < len(visibilities):
            vis_val = visibilities[idx]
            if vis_val is not None:
                return round(float(vis_val) / 1000.0, 1)

    return None


async def get_weather_forecast(
    lat: float,
    lon: float,
    client: httpx.AsyncClient | None = None,
) -> WeatherResponse:
    """Fetch current weather and Night Honor Score from Open-Meteo with caching."""
    cache_key = (round(lat, 2), round(lon, 2))
    now = time.monotonic()

    # Check cache
    if cache_key in _WEATHER_CACHE:
        cached_resp, expires_at = _WEATHER_CACHE[cache_key]
        if expires_at > now:
            # Return cached response updated with exact requested lat/lon
            return cached_resp.model_copy(
                update={"location": LocationCoords(lat=lat, lon=lon, name=None)}
            )
        else:
            del _WEATHER_CACHE[cache_key]

    params = {
        "latitude": lat,
        "longitude": lon,
        "current": "cloud_cover,relative_humidity_2m",
        "hourly": "visibility",
        "timezone": "auto",
    }

    should_close_client = False
    if client is None:
        client = httpx.AsyncClient(timeout=8.0)
        should_close_client = True

    data: dict[str, Any] | None = None
    try:
        max_retries = 1
        last_exc: Exception | None = None

        for attempt in range(max_retries + 1):
            try:
                response = await client.get(OPEN_METEO_URL, params=params)
                if response.status_code == 200:
                    data = response.json()
                    break
                elif attempt == max_retries:
                    logger.error(
                        "Open-Meteo returned status %d: %s",
                        response.status_code,
                        response.text,
                    )
                    raise APIError(
                        status_code=502,
                        code="upstream_unavailable",
                        message=f"Open-Meteo API returned status {response.status_code}",
                    )
            except (httpx.RequestError, httpx.TimeoutException) as exc:
                last_exc = exc
                if attempt == max_retries:
                    logger.error("Open-Meteo request failed: %s", exc)
                    raise APIError(
                        status_code=502,
                        code="upstream_unavailable",
                        message="Open-Meteo service timed out or was unreachable.",
                    ) from exc

        if data is None:
            raise APIError(
                status_code=502,
                code="upstream_unavailable",
                message="Open-Meteo returned no data.",
            )

        current = data.get("current")
        if not isinstance(current, dict):
            raise APIError(
                status_code=502,
                code="upstream_unavailable",
                message="Open-Meteo response missing current weather data.",
            )

        cloud_cover = float(current.get("cloud_cover", 0))
        humidity = float(current.get("relative_humidity_2m", 0))
        current_time = str(current.get("time", ""))
        utc_offset_seconds = int(data.get("utc_offset_seconds", 0))
        timezone_name = str(data.get("timezone", "UTC"))

        hourly = data.get("hourly", {})
        visibility_km = _find_matching_visibility(hourly, current_time)

        timestamp_iso = _format_iso_timestamp(current_time, utc_offset_seconds)
        night_honor_score = calculate_night_honor_score(
            cloud_cover=cloud_cover,
            humidity=humidity,
            visibility_km=visibility_km,
        )

        weather_response = WeatherResponse(
            location=LocationCoords(lat=lat, lon=lon, name=None),
            cloud_cover_percent=cloud_cover,
            humidity_percent=humidity,
            visibility_km=visibility_km,
            night_honor_score=night_honor_score,
            score_method=SCORE_METHOD,
            source="Open-Meteo",
            data_kind="live",
            timestamp=timestamp_iso,
            timezone=timezone_name,
            attribution="Weather data by Open-Meteo.com",
        )

        # Store in cache for 10 minutes
        _WEATHER_CACHE[cache_key] = (weather_response, time.monotonic() + CACHE_TTL_SECONDS)

        return weather_response
    finally:
        if should_close_client:
            await client.aclose()
