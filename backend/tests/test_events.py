from datetime import datetime
from unittest.mock import AsyncMock, patch
import httpx
import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.schemas import EventsResponse
from backend.app.services.launches import clear_launches_cache

client = TestClient(app, raise_server_exceptions=False)

MOCK_LL2_RESPONSE = {
    "count": 1,
    "next": None,
    "previous": None,
    "results": [
        {
            "id": "mock-launch-123",
            "name": "Falcon 9 Block 5 | Starlink Group 7-1",
            "net": "2026-11-10T14:30:00Z",
            "status": {"name": "Go for Launch"},
            "pad": {
                "name": "Space Launch Complex 40",
                "location": {
                    "name": "Cape Canaveral, FL, USA",
                    "timezone_name": "America/New_York",
                },
            },
            "mission": {"description": "Deployment of communication satellites."},
        }
    ],
}


@pytest.fixture(autouse=True)
def reset_launches() -> None:
    clear_launches_cache()
    yield
    clear_launches_cache()


def test_events_all_within_window() -> None:
    mock_resp = httpx.Response(
        status_code=200,
        json=MOCK_LL2_RESPONSE,
        request=httpx.Request("GET", "https://ll.thespacedevs.com/2.2.0/launch/upcoming/?limit=15"),
    )

    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = mock_resp
        response = client.get("/api/events?type=all&date=2026-11-01")

        assert response.status_code == 200
        data = response.json()
        model = EventsResponse.model_validate(data)

        assert model.query.type == "all"
        assert model.query.date == "2026-11-01"
        assert model.query.days == 90
        assert len(model.events) > 0

        # Verify chronological order
        timestamps = [
            datetime.fromisoformat(ev.start_time.replace("Z", "+00:00")).timestamp()
            for ev in model.events
        ]
        assert timestamps == sorted(timestamps)

        # Verify all events fall strictly within the 90 day window
        start_ts = datetime.fromisoformat("2026-11-01T00:00:00+05:30").timestamp()
        end_ts = datetime.fromisoformat("2026-11-01T00:00:00+05:30").timestamp() + (91 * 86400)
        for ts in timestamps:
            assert start_ts <= ts <= end_ts

        # Verify ISO-8601 with offset
        for ev in model.events:
            assert "+" in ev.start_time or "-" in ev.start_time or "Z" in ev.start_time
            assert ev.timezone != ""


def test_events_filter_moon_phases_only() -> None:
    response = client.get("/api/events?type=moon_phase&date=2026-11-01")
    assert response.status_code == 200
    data = response.json()
    model = EventsResponse.model_validate(data)

    assert len(model.events) > 0
    for ev in model.events:
        assert ev.type == "moon_phase"
        assert ev.data_kind == "computed"
        assert "approximate" in ev.description.lower() or "approximate" in ev.title.lower()


def test_events_filter_meteor_showers_only() -> None:
    response = client.get("/api/events?type=meteor_shower&date=2026-11-01")
    assert response.status_code == 200
    data = response.json()
    model = EventsResponse.model_validate(data)

    assert len(model.events) > 0
    for ev in model.events:
        assert ev.type == "meteor_shower"
        assert ev.data_kind == "curated"
        assert "imo" in ev.id.lower() or "https://" in ev.source


def test_events_filter_launches_only() -> None:
    mock_resp = httpx.Response(
        status_code=200,
        json=MOCK_LL2_RESPONSE,
        request=httpx.Request("GET", "https://ll.thespacedevs.com/2.2.0/launch/upcoming/?limit=15"),
    )

    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = mock_resp
        response = client.get("/api/events?type=launch&date=2026-11-01")

        assert response.status_code == 200
        data = response.json()
        model = EventsResponse.model_validate(data)

        for ev in model.events:
            assert ev.type == "launch"
            assert ev.data_kind == "live"


def test_events_ll2_failure_degrades_gracefully() -> None:
    # Simulate LL2 failure (500 or timeout)
    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_get.side_effect = httpx.TimeoutException("Launch Library 2 timed out")

        response = client.get("/api/events?type=all&date=2026-11-01")
        assert response.status_code == 200
        data = response.json()
        model = EventsResponse.model_validate(data)

        # Still returns other events (moon, meteor showers)
        assert len(model.events) > 0
        # Warnings include "launches unavailable"
        assert "launches unavailable" in model.warnings


def test_events_invalid_parameters() -> None:
    # Invalid date format -> 422 invalid_parameter
    r1 = client.get("/api/events?date=invalid-date")
    assert r1.status_code == 422
    assert r1.json()["error"]["code"] == "invalid_parameter"

    # Invalid type -> 422 invalid_parameter
    r2 = client.get("/api/events?type=invalid_type")
    assert r2.status_code == 422
    assert r2.json()["error"]["code"] == "invalid_parameter"
