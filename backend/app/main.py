import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.errors import register_error_handlers
from backend.app.routes import (
    events_router,
    image_router,
    locations_router,
    weather_router,
)
from backend.app.schemas import HealthResponse

app = FastAPI(title="Tsukuyomi Watch")

cors_origins_env = os.getenv(
    "CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
)
origins = [origin.strip() for origin in cors_origins_env.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)

register_error_handlers(app)

# Include routers
app.include_router(weather_router)
app.include_router(locations_router)
app.include_router(events_router)
app.include_router(image_router)


@app.get("/api/health", response_model=HealthResponse, tags=["health"])
def get_health() -> HealthResponse:
    return HealthResponse(status="ok")
