import json
from pathlib import Path
from fastapi import APIRouter
from backend.app.schemas import LocationItem, LocationsResponse

router = APIRouter(tags=["locations"])

LOCATIONS_FILE = Path(__file__).resolve().parent.parent / "data" / "locations.json"
DISCLAIMER = "Weather cannot verify accessibility, safety or light pollution."


def load_locations() -> list[LocationItem]:
    if not LOCATIONS_FILE.exists():
        return []
    with open(LOCATIONS_FILE, "r", encoding="utf-8") as f:
        raw = json.load(f)
    return [LocationItem(**item) for item in raw]


@router.get("/api/locations", response_model=LocationsResponse)
def get_locations() -> LocationsResponse:
    locations = load_locations()
    return LocationsResponse(
        locations=locations,
        disclaimer=DISCLAIMER,
    )
