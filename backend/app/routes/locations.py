from fastapi import APIRouter
from backend.app.schemas import LocationItem, LocationsResponse

router = APIRouter(tags=["locations"])


@router.get("/api/locations", response_model=LocationsResponse)
def get_locations() -> LocationsResponse:
    return LocationsResponse(
        locations=[
            LocationItem(
                id="sukhna-lake",
                name="Sukhna Lake",
                lat=30.7421,
                lon=76.8188,
                provenance="Curated by the team from OpenStreetMap; NOT verified for light pollution, access or safety",
                verified=False,
                data_kind="curated",
            )
        ],
        disclaimer="Weather cannot verify accessibility, safety or light pollution.",
    )
