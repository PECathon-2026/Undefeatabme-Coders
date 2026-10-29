from fastapi import APIRouter, Query
from backend.app.schemas import WeatherResponse
from backend.app.services.weather import get_weather_forecast

router = APIRouter(tags=["weather"])


@router.get("/api/weather", response_model=WeatherResponse)
async def get_weather(
    lat: float = Query(..., ge=-90.0, le=90.0, description="Latitude between -90 and 90"),
    lon: float = Query(..., ge=-180.0, le=180.0, description="Longitude between -180 and 180"),
) -> WeatherResponse:
    return await get_weather_forecast(lat=lat, lon=lon)
