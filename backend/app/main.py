import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.errors import register_error_handlers

app = FastAPI(title="Tsukuyomi Watch")

cors_origins_env = os.getenv(
    "CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
)
origins = [origin.strip() for origin in cors_origins_env.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

register_error_handlers(app)


@app.get("/api/health")
def get_health() -> dict[str, str]:
    return {"status": "ok"}

