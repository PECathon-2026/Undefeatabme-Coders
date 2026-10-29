import logging
import time
from datetime import datetime, timezone
from typing import Any
import httpx
from backend.app.schemas import EventItem

logger = logging.getLogger("tsukuyomi.launches")

LL2_UPCOMING_URL = "https://ll.thespacedevs.com/2.2.0/launch/upcoming/?limit=15"
CACHE_TTL_SECONDS = 1800.0  # 30 minutes

_LAUNCH_CACHE: tuple[list[EventItem], float] | None = None


def clear_launches_cache() -> None:
    """Clear cached launches (used in tests)."""
    global _LAUNCH_CACHE
    _LAUNCH_CACHE = None


async def fetch_upcoming_launches(
    client: httpx.AsyncClient | None = None,
) -> tuple[list[EventItem], list[str]]:
    """Fetch upcoming rocket launches from Launch Library 2 with caching and graceful degradation."""
    global _LAUNCH_CACHE
    now = time.monotonic()

    if _LAUNCH_CACHE is not None:
        cached_items, expires_at = _LAUNCH_CACHE
        if expires_at > now:
            return cached_items, []

    should_close_client = False
    if client is None:
        client = httpx.AsyncClient(timeout=8.0)
        should_close_client = True

    warnings: list[str] = []
    events: list[EventItem] = []

    try:
        max_retries = 1
        data: dict[str, Any] | None = None

        for attempt in range(max_retries + 1):
            try:
                response = await client.get(
                    LL2_UPCOMING_URL,
                    headers={"User-Agent": "TsukuyomiWatch/1.0 (Hackathon Astronomy App)"},
                )
                if response.status_code == 200:
                    data = response.json()
                    break
                elif response.status_code == 429:
                    logger.warning("Launch Library 2 rate limited (HTTP 429)")
                    warnings.append("launches unavailable")
                    return [], warnings
                elif attempt == max_retries:
                    logger.warning(
                        "Launch Library 2 returned status %d", response.status_code
                    )
                    warnings.append("launches unavailable")
                    return [], warnings
            except (httpx.RequestError, httpx.TimeoutException) as exc:
                if attempt == max_retries:
                    logger.warning("Launch Library 2 request failed: %s", exc)
                    warnings.append("launches unavailable")
                    return [], warnings

        if data and "results" in data:
            for item in data["results"]:
                net_str = item.get("net")
                if not net_str:
                    continue

                # Ensure ISO-8601 offset format
                try:
                    dt = datetime.fromisoformat(net_str.replace("Z", "+00:00"))
                    iso_time = dt.isoformat(timespec="seconds")
                except ValueError:
                    iso_time = net_str

                status_name = item.get("status", {}).get("name", "Scheduled")
                pad = item.get("pad", {})
                pad_name = pad.get("name", "Unknown Pad")
                location_name = pad.get("location", {}).get("name", "Unknown Location")
                timezone_name = pad.get("location", {}).get("timezone_name") or "UTC"

                mission_desc = ""
                mission = item.get("mission")
                if mission and isinstance(mission, dict):
                    mission_desc = mission.get("description", "")

                desc = f"Status: {status_name}. Pad: {pad_name}, {location_name}."
                if mission_desc:
                    desc += f" Mission: {mission_desc}"

                launch_event = EventItem(
                    id=f"ll2-{item.get('id', '')}",
                    type="launch",
                    title=item.get("name", "Rocket Launch"),
                    start_time=iso_time,
                    timezone=timezone_name,
                    source="Launch Library 2 (thespacedevs.com)",
                    description=desc,
                    data_kind="live",
                )
                events.append(launch_event)

            _LAUNCH_CACHE = (events, time.monotonic() + CACHE_TTL_SECONDS)
            return events, warnings

    except Exception as exc:
        logger.exception("Unexpected error while fetching launches: %s", exc)
        warnings.append("launches unavailable")
        return [], warnings
    finally:
        if should_close_client:
            await client.aclose()

    return events, warnings
