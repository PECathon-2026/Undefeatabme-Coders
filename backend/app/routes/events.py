import json
import logging
from datetime import datetime, timedelta
from pathlib import Path
from typing import Literal
from zoneinfo import ZoneInfo
from fastapi import APIRouter, Query
from backend.app.errors import APIError
from backend.app.schemas import (
    EventItem,
    EventsQuery,
    EventsResponse,
)
from backend.app.services.launches import fetch_upcoming_launches
from backend.app.services.moon import get_moon_phases

logger = logging.getLogger("tsukuyomi.events")
router = APIRouter(tags=["events"])

STATIC_EVENTS_FILE = Path(__file__).resolve().parent.parent / "data" / "events_static.json"
TARGET_TZ = ZoneInfo("Asia/Kolkata")
VALID_TYPES = {"all", "moon_phase", "meteor_shower", "eclipse", "launch"}


def _load_static_events() -> list[EventItem]:
    if not STATIC_EVENTS_FILE.exists():
        return []
    try:
        with open(STATIC_EVENTS_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
        return [EventItem(**item) for item in data]
    except Exception as exc:
        logger.error("Failed to load static events: %s", exc)
        return []


def _parse_event_datetime(dt_str: str) -> datetime:
    """Parse ISO-8601 timestamp string for sorting and window comparison."""
    clean_str = dt_str.replace("Z", "+00:00")
    return datetime.fromisoformat(clean_str)


@router.get("/api/events", response_model=EventsResponse)
async def get_events(
    type: Literal["all", "moon_phase", "meteor_shower", "eclipse", "launch"] = Query(
        "all", description="Event type filter"
    ),
    date: str | None = Query(
        None, description="Start date YYYY-MM-DD (defaults to today in Asia/Kolkata)"
    ),
) -> EventsResponse:
    # 1. Parse or default date in Asia/Kolkata
    if date:
        try:
            parsed_date = datetime.strptime(date, "%Y-%m-%d").date()
        except ValueError:
            raise APIError(
                status_code=422,
                code="invalid_parameter",
                message="Invalid date format. Expected YYYY-MM-DD.",
            )
        date_str = date
    else:
        now_local = datetime.now(TARGET_TZ)
        parsed_date = now_local.date()
        date_str = parsed_date.strftime("%Y-%m-%d")

    start_dt = datetime(
        parsed_date.year, parsed_date.month, parsed_date.day, 0, 0, 0, tzinfo=TARGET_TZ
    )
    end_dt = start_dt + timedelta(days=90, hours=23, minutes=59, seconds=59)

    collected_events: list[EventItem] = []
    warnings: list[str] = []

    # 2. Moon phases (computed)
    if type in ("all", "moon_phase"):
        moon_events = get_moon_phases(start_dt, days=90)
        collected_events.extend(moon_events)

    # 3. Static events (meteor showers & eclipses)
    if type in ("all", "meteor_shower", "eclipse"):
        static_events = _load_static_events()
        for ev in static_events:
            if type != "all" and ev.type != type:
                continue
            ev_dt = _parse_event_datetime(ev.start_time)
            if start_dt <= ev_dt <= end_dt:
                collected_events.append(ev)

    # 4. Rocket launches (Launch Library 2)
    if type in ("all", "launch"):
        launch_events, launch_warnings = await fetch_upcoming_launches()
        warnings.extend(launch_warnings)
        for ev in launch_events:
            try:
                ev_dt = _parse_event_datetime(ev.start_time)
                if start_dt <= ev_dt <= end_dt:
                    collected_events.append(ev)
            except Exception:
                # If parsing fails on external item, skip safely
                continue

    # 5. Sort chronologically by start_time
    collected_events.sort(key=lambda ev: _parse_event_datetime(ev.start_time))

    now_generated = datetime.now(TARGET_TZ).isoformat(timespec="seconds")
    return EventsResponse(
        events=collected_events,
        query=EventsQuery(type=type, date=date_str, days=90),
        warnings=warnings,
        generated_at=now_generated,
    )
