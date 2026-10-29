from unittest.mock import AsyncMock, patch
import httpx
import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.schemas import WeatherResponse
from backend.app.services.weather import clear_weather_cache

client = TestClient(app, raise_server_exceptions=False)

MOCK_OPEN_METEO_RESPONSE = {
    "latitude": 30.74,
    "longitude": 76.78,
    "utc_offset_seconds": 19800,
    "timezone": "Asia/Kolkata",
    "timezone_abbreviation": "IST",
    "current": {
        "time": "2026-10-30T21:00",
        "cloud_cover": 23,
        "relative_humidity_2m": 55,
    },
    "hourly": {
        "time": ["2026-10-30T20:00", "2026-10-30T21:00", "2026-10-30T22:00"],
        "visibility": [20000.0, 24100.0, 25000.0],
    },
}


@pytest.fixture(autouse=True)
def reset_cache() -> None:
    clear_weather_cache()
    yield
    clear_weather_cache()


def test_weather_endpoint_success() -> None:
    mock_resp = httpx.Response(
        status_code=200,
        json=MOCK_OPEN_METEO_RESPONSE,
        request=httpx.Request("GET", "https://api.open-meteo.com/v1/forecast"),
    )

    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = mock_resp
        response = client.get("/api/weather?lat=30.7333&lon=76.7794")

        assert response.status_code == 200
        data = response.json()
        model = WeatherResponse.model_validate(data)

        assert model.location.lat == 30.7333
        assert model.location.lon == 76.7794
        assert model.cloud_cover_percent == 23.0
        assert model.humidity_percent == 55.0
        assert model.visibility_km == 24.1
        assert model.night_honor_score == 75
        assert model.source == "Open-Meteo"
        assert model.data_kind == "live"
        assert model.timezone == "Asia/Kolkata"
        assert model.timestamp == "2026-10-30T21:00:00+05:30"
        assert model.attribution == "Weather data by Open-Meteo.com"
        assert mock_get.call_count == 1


def test_weather_caching_behavior() -> None:
    mock_resp = httpx.Response(
        status_code=200,
        json=MOCK_OPEN_METEO_RESPONSE,
        request=httpx.Request("GET", "https://api.open-meteo.com/v1/forecast"),
    )

    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = mock_resp

        # First request fetches upstream
        res1 = client.get("/api/weather?lat=30.7333&lon=76.7794")
        assert res1.status_code == 200
        assert mock_get.call_count == 1

        # Second request with same coords rounded to 2 decimals uses cache
        res2 = client.get("/api/weather?lat=30.731&lon=76.782")
        assert res2.status_code == 200
        assert mock_get.call_count == 1  # No additional call to upstream


def test_weather_upstream_failure_status_502() -> None:
    mock_error_resp = httpx.Response(
        status_code=500,
        text="Internal Server Error",
        request=httpx.Request("GET", "https://api.open-meteo.com/v1/forecast"),
    )

    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = mock_error_resp
        response = client.get("/api/weather?lat=30.7333&lon=76.7794")

        assert response.status_code == 502
        data = response.json()
        assert data["error"]["code"] == "upstream_unavailable"
        assert "500" in data["error"]["message"]
        # Retried once (total 2 attempts)
        assert mock_get.call_count == 2


def test_weather_upstream_timeout_status_502() -> None:
    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_get.side_effect = httpx.TimeoutException("Connection timed out")
        response = client.get("/api/weather?lat=30.7333&lon=76.7794")

        assert response.status_code == 502
        data = response.json()
        assert data["error"]["code"] == "upstream_unavailable"
        assert "timed out" in data["error"]["message"].lower()
        # Retried once
        assert mock_get.call_count == 2


def test_weather_null_visibility_matching() -> None:
    response_no_vis = dict(MOCK_OPEN_METEO_RESPONSE)
    response_no_vis["hourly"] = {"time": [], "visibility": []}
    mock_resp = httpx.Response(
        status_code=200,
        json=response_no_vis,
        request=httpx.Request("GET", "https://api.open-meteo.com/v1/forecast"),
    )

    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = mock_resp
        response = client.get("/api/weather?lat=30.7333&lon=76.7794")

        assert response.status_code == 200
        data = response.json()
        assert data["visibility_km"] is None
        # Score with null visibility: 0.75*(100-23) + 0.25*(100-55) = 0.75*77 + 0.25*45 = 57.75 + 11.25 = 69
        assert data["night_honor_score"] == 69
