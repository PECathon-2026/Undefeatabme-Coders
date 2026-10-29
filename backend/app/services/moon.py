from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo
from backend.app.schemas import EventItem

# Astronomical synodic month in days (mean duration between new moons)
SYNODIC_MONTH_DAYS = 29.53058867
# Known New Moon reference epoch: 2000-01-06 18:14:00 UTC
EPOCH_NEW_MOON = datetime(2000, 1, 6, 18, 14, 0, tzinfo=timezone.utc)
TARGET_TZ = ZoneInfo("Asia/Kolkata")

PHASES = [
    (0.0, "new_moon", "New Moon (Approximate)"),
    (0.25, "first_quarter", "First Quarter Moon (Approximate)"),
    (0.5, "full_moon", "Full Moon (Approximate)"),
    (0.75, "last_quarter", "Last Quarter Moon (Approximate)"),
]


def get_moon_phases(start_date: datetime, days: int = 90) -> list[EventItem]:
    """Compute approximate moon phases within the date window using mean-lunation formula."""
    end_date = start_date + timedelta(days=days)

    # Convert start_date to UTC for astronomical calculation
    start_utc = start_date.astimezone(timezone.utc)
    end_utc = end_date.astimezone(timezone.utc)

    # Determine lunation indices
    start_lunation = int((start_utc - EPOCH_NEW_MOON).total_seconds() / (SYNODIC_MONTH_DAYS * 86400)) - 1
    end_lunation = int((end_utc - EPOCH_NEW_MOON).total_seconds() / (SYNODIC_MONTH_DAYS * 86400)) + 2

    events: list[EventItem] = []

    for k in range(start_lunation, end_lunation):
        for frac, phase_slug, phase_title in PHASES:
            phase_dt_utc = EPOCH_NEW_MOON + timedelta(days=(k + frac) * SYNODIC_MONTH_DAYS)
            if start_utc <= phase_dt_utc <= end_utc:
                # Convert to target timezone Asia/Kolkata
                phase_dt_local = phase_dt_utc.astimezone(TARGET_TZ)
                event_id = f"moon-{phase_slug}-{phase_dt_local.strftime('%Y%m%d')}"
                events.append(
                    EventItem(
                        id=event_id,
                        type="moon_phase",
                        title=phase_title,
                        start_time=phase_dt_local.isoformat(timespec="seconds"),
                        timezone="Asia/Kolkata",
                        source="mean-lunation-approximation",
                        description=(
                            f"{phase_title} computed using standard mean synodic period (approximate). "
                            "Actual lunar timing may vary by several hours due to orbital eccentricity."
                        ),
                        data_kind="computed",
                    )
                )

    return events
