from fastapi import APIRouter, Query
from backend.app.schemas import WeatherResponse

router = APIRouter(tags=["weather"])


@router.get("/api/weather", response_model=WeatherResponse)
def get_weather(
    lat: float = Query(..., ge=-90.0, le=90.0, description="Latitude between -90 and 90"),
    lon: float = Query(..., ge=-180.0, le=180.0, description="Longitude between -180 and 180"),
) -> WeatherResponse:
    return WeatherResponse(
        location={"lat": lat, "lon": lon, "name": None},
        cloud_cover_percent=23.0,
        humidity_percent=55.0,
        visibility_km=24.1,
        night_honor_score=75,
        score_method="v1: 0.6*clear_sky + 0.2*dryness + 0.2*visibility(capped 20 km); weights 0.75/0.25 if visibility is null; ignores moon and light pollution",
        source="sample",
        data_kind="mock",
        timestamp="2026-10-30T21:00:00+05:30",
        timezone="Asia/Kolkata",
        attribution="Weather data by Open-Meteo.com",
    )
