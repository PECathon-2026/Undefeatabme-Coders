from fastapi import APIRouter, Query
from backend.app.schemas import EventItem, EventsQuery, EventsResponse

router = APIRouter(tags=["events"])


@router.get("/api/events", response_model=EventsResponse)
def get_events(
    type: str = Query("all", description="Event type: all, moon_phase, meteor_shower, eclipse, launch"),
    date: str = Query("2026-11-01", description="Date YYYY-MM-DD"),
) -> EventsResponse:
    return EventsResponse(
        events=[
            EventItem(
                id="sample-leonids",
                type="meteor_shower",
                title="Leonids (sample entry)",
                start_time="2026-11-17T00:00:00+05:30",
                timezone="Asia/Kolkata",
                source="sample",
                description="Sample only. Real entries carry a source URL.",
                data_kind="mock",
            )
        ],
        query=EventsQuery(type=type, date=date, days=90),
        warnings=[],
        generated_at="2026-10-30T21:05:00+05:30",
    )
