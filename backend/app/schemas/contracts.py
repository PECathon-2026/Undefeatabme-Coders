from typing import Any, Literal
from pydantic import BaseModel, Field


class ErrorDetail(BaseModel):
    code: str
    message: str


class ErrorResponse(BaseModel):
    error: ErrorDetail


class HealthResponse(BaseModel):
    status: str


class LocationCoords(BaseModel):
    lat: float = Field(..., ge=-90.0, le=90.0, description="Latitude in degrees (-90 to 90)")
    lon: float = Field(..., ge=-180.0, le=180.0, description="Longitude in degrees (-180 to 180)")
    name: str | None = None


class WeatherResponse(BaseModel):
    location: LocationCoords
    cloud_cover_percent: float
    humidity_percent: float
    visibility_km: float | None = None
    night_honor_score: int
    score_method: str
    source: str
    data_kind: Literal["live", "curated", "mock", "computed"]
    timestamp: str
    timezone: str
    attribution: str


class LocationItem(BaseModel):
    id: str
    name: str
    lat: float
    lon: float
    provenance: str
    verified: bool
    data_kind: Literal["live", "curated", "mock", "computed"]


class LocationsResponse(BaseModel):
    locations: list[LocationItem]
    disclaimer: str


class EventItem(BaseModel):
    id: str
    type: str
    title: str
    start_time: str
    timezone: str
    source: str
    description: str
    data_kind: Literal["live", "curated", "mock", "computed"]


class EventsQuery(BaseModel):
    type: str
    date: str
    days: int


class EventsResponse(BaseModel):
    events: list[EventItem]
    query: EventsQuery
    warnings: list[str]
    generated_at: str


class RestoreResponse(BaseModel):
    restored_image: str
    width: int
    height: int
    model_name: str
    model_license: str
    runtime_ms: int
    data_kind: Literal["live", "curated", "mock", "computed"]
    warnings: list[str]


class CandidateSource(BaseModel):
    id: int
    x: float
    y: float
    peak_brightness: float
    approx_size_px: float


class DetectSourcesResponse(BaseModel):
    image_width: int
    image_height: int
    method: str
    count: int
    sources: list[CandidateSource]
    data_kind: Literal["live", "curated", "mock", "computed"]
    warnings: list[str]
