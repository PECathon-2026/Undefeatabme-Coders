from backend.app.routes.events import router as events_router
from backend.app.routes.image import router as image_router
from backend.app.routes.locations import router as locations_router
from backend.app.routes.weather import router as weather_router

__all__ = [
    "events_router",
    "image_router",
    "locations_router",
    "weather_router",
]
