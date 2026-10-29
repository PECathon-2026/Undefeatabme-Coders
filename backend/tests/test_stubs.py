import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.schemas import (
    CandidateSource,
    DetectSourcesResponse,
    ErrorResponse,
    EventsResponse,
    LocationsResponse,
    RestoreResponse,
    WeatherResponse,
)

client = TestClient(app, raise_server_exceptions=False)


@pytest.mark.parametrize(
    "query",
    [
        "lat=95&lon=76.7794",
        "lat=-95&lon=76.7794",
        "lat=30.7333&lon=185",
        "lat=30.7333&lon=-185",
        "lat=invalid&lon=76.7794",
        "lat=30.7333",  # missing lon
        "lon=76.7794",  # missing lat
    ],
)
def test_weather_invalid_coordinates(query: str) -> None:
    response = client.get(f"/api/weather?{query}")
    assert response.status_code == 422
    data = response.json()
    assert "error" in data
    assert data["error"]["code"] == "invalid_parameter"
    assert "message" in data["error"]


def test_locations_stub_validates_schema() -> None:
    response = client.get("/api/locations")
    assert response.status_code == 200
    data = response.json()
    model = LocationsResponse.model_validate(data)
    assert len(model.locations) > 0
    assert model.locations[0].id == "sukhna-lake"
    assert model.disclaimer != ""


def test_restore_stub_returns_501() -> None:
    response = client.post("/api/restore")
    assert response.status_code == 501
    data = response.json()
    assert "error" in data
    assert data["error"]["code"] == "not_implemented"
    assert "message" in data["error"]


def test_detect_objects_stub_returns_501() -> None:
    response = client.post("/api/detect-objects")
    assert response.status_code == 501
    data = response.json()
    assert "error" in data
    assert data["error"]["code"] == "not_implemented"
    assert "message" in data["error"]


def test_contract_schemas_can_validate_contract_samples() -> None:
    # Contract sample for WeatherResponse
    weather_sample = {
        "location": {"lat": 30.7333, "lon": 76.7794, "name": None},
        "cloud_cover_percent": 23,
        "humidity_percent": 55,
        "visibility_km": 24.1,
        "night_honor_score": 75,
        "score_method": (
            "v1: 0.6*clear_sky + 0.2*dryness + 0.2*visibility(capped 20 km); "
            "weights 0.75/0.25 if visibility is null; ignores moon and light pollution"
        ),
        "source": "Open-Meteo",
        "data_kind": "live",
        "timestamp": "2026-10-30T21:00:00+05:30",
        "timezone": "Asia/Kolkata",
        "attribution": "Weather data by Open-Meteo.com",
    }
    weather_model = WeatherResponse.model_validate(weather_sample)
    assert weather_model.location.lat == 30.7333
    assert weather_model.night_honor_score == 75

    # Contract sample for EventsResponse
    events_sample = {
        "events": [
            {
                "id": "sample-leonids",
                "type": "meteor_shower",
                "title": "Leonids (sample entry)",
                "start_time": "2026-11-17T00:00:00+05:30",
                "timezone": "Asia/Kolkata",
                "source": "sample",
                "description": "Sample only. Real entries carry a source URL.",
                "data_kind": "mock",
            }
        ],
        "query": {"type": "all", "date": "2026-11-01", "days": 90},
        "warnings": [],
        "generated_at": "2026-10-30T21:05:00+05:30",
    }
    events_model = EventsResponse.model_validate(events_sample)
    assert len(events_model.events) == 1
    assert events_model.events[0].id == "sample-leonids"

    # Contract sample for RestoreResponse
    restore_sample = {
        "restored_image": "data:image/png;base64,iVBORw0KGgo...",
        "width": 1024,
        "height": 768,
        "model_name": "opencv-nlmeans-unsharp-baseline",
        "model_license": "Apache-2.0 (OpenCV)",
        "runtime_ms": 2140,
        "data_kind": "computed",
        "warnings": [
            "Restored image is an algorithmic enhancement, not new data. Features may be artefacts."
        ],
    }
    restore_model = RestoreResponse.model_validate(restore_sample)
    assert restore_model.width == 1024
    assert restore_model.model_name == "opencv-nlmeans-unsharp-baseline"

    # Contract sample for DetectSourcesResponse
    detect_sample = {
        "image_width": 1024,
        "image_height": 768,
        "method": "opencv-threshold-centroid",
        "count": 2,
        "sources": [
            {
                "id": 1,
                "x": 312.4,
                "y": 190.8,
                "peak_brightness": 0.93,
                "approx_size_px": 4.1,
            },
            {
                "id": 2,
                "x": 640.0,
                "y": 455.2,
                "peak_brightness": 0.41,
                "approx_size_px": 3.2,
            },
        ],
        "data_kind": "computed",
        "warnings": ["Detections are candidates, not confirmed astronomical objects."],
    }
    detect_model = DetectSourcesResponse.model_validate(detect_sample)
    assert detect_model.count == 2
    assert len(detect_model.sources) == 2

    # Contract error sample
    error_sample = {
        "error": {
            "code": "invalid_image",
            "message": "File is not a valid JPEG or PNG image.",
        }
    }
    error_model = ErrorResponse.model_validate(error_sample)
    assert error_model.error.code == "invalid_image"
