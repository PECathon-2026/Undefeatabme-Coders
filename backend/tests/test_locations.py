from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.schemas import LocationsResponse

client = TestClient(app, raise_server_exceptions=False)


def test_locations_list_structure() -> None:
    response = client.get("/api/locations")
    assert response.status_code == 200
    data = response.json()
    model = LocationsResponse.model_validate(data)

    # 5 to 8 curated spots
    assert 5 <= len(model.locations) <= 8
    assert model.disclaimer == "Weather cannot verify accessibility, safety or light pollution."

    for loc in model.locations:
        assert isinstance(loc.id, str) and len(loc.id) > 0
        assert isinstance(loc.name, str) and len(loc.name) > 0
        # Latitude and longitude near Chandigarh / Punjab (around 30-32 N, 75-78 E)
        assert 29.0 <= loc.lat <= 33.0
        assert 74.0 <= loc.lon <= 78.0
        assert "OpenStreetMap" in loc.provenance
        assert loc.verified is False
        assert loc.data_kind == "curated"
