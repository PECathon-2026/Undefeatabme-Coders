# Tsukuyomi Watch - Backend Service

FastAPI backend service powering **Tsukuyomi Watch**, an astronomical web app providing stargazing conditions, astronomical events, rocket launches, image restoration, and candidate source detection.

---

## 1. Prerequisites

- Python **3.11, 3.12, or 3.13**
- Git

A clean production install works with only `backend/requirements.txt` (no heavy packages or PyTorch required).

---

## 2. Local Environment Setup

### Windows (PowerShell)
```powershell
# Create virtual environment
python -m venv .venv

# Activate virtual environment
.\.venv\Scripts\Activate.ps1

# Install core and dev dependencies
python -m pip install --upgrade pip
python -m pip install -r backend\requirements.txt -r backend\requirements-dev.txt
```

### Linux / macOS (Bash)
```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r backend/requirements.txt -r backend/requirements-dev.txt
```

---

## 3. Running the Server

Start the local development server with live reload:
```bash
python -m uvicorn backend.app.main:app --reload --port 8000
```

- **Health check**: [http://localhost:8000/api/health](http://localhost:8000/api/health)
- **Interactive Swagger Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **OpenAPI Schema**: [http://localhost:8000/openapi.json](http://localhost:8000/openapi.json)

---

## 4. Running Tests

Run the full automated test suite using pytest:
```bash
python -m pytest backend
```

Run test suite with verbose output:
```bash
python -m pytest backend -v
```

---

## 5. Environment Variables

| Variable | Default Value | Description |
|---|---|---|
| `CORS_ORIGINS` | `http://localhost:5173,http://127.0.0.1:5173` | Comma-separated list of allowed web origins for CORS headers. Set to the deployed frontend URL in production. |
| `RESTORE_BACKEND` | `baseline` | Image restoration engine: defaults to `baseline` (OpenCV Non-local Means & Unsharp Mask) or `model` (optional neural model). |

---

## 6. Endpoints Summary

All responses strictly follow [docs/api-contracts.md](../docs/api-contracts.md).

- `GET /api/health`: Health status check (`{"status": "ok"}`).
- `GET /api/weather?lat={float}&lon={float}`: Real-time cloud cover, humidity, visibility, and computed Night Honor Score (0-100) via Open-Meteo.
- `GET /api/locations`: Curated candidate stargazing spots near Chandigarh and Punjab with safety disclaimer.
- `GET /api/events?type={type}&date={YYYY-MM-DD}`: Chronological 90-day astronomical events (approximate moon phases, IMO meteor showers, NASA eclipses, and Launch Library 2 rocket launches).
- `POST /api/restore` (multipart `file`): Algorithmic restoration of JPEG/PNG images (32px to 2048px, max 10 MB).
- `POST /api/detect-objects` (multipart `file`): Candidate astronomical source detection with centroid coordinates and normalized brightness.

---

## 7. Error Handling

All error responses strictly match the unified JSON structure:
```json
{
  "error": {
    "code": "invalid_parameter",
    "message": "Human-readable description."
  }
}
```

Standard codes:
- `invalid_parameter` (HTTP 422): Malformed query, path, or form inputs.
- `invalid_image` (HTTP 422): File is not a valid or decodeable JPEG/PNG.
- `unsupported_type` (HTTP 415): Uploaded format not supported (e.g. FITS).
- `file_too_large` (HTTP 413): File payload exceeds 10 MB limit.
- `image_too_large` (HTTP 422): Image dimensions exceed 2048 px or fall below 32 px.
- `rate_limited` (HTTP 429): Exceeded 10 image requests per minute per IP.
- `upstream_unavailable` (HTTP 502): External service (e.g. Open-Meteo) timed out or failed.
- `not_implemented` (HTTP 501): Feature not enabled.
- `internal_error` (HTTP 500): Unhandled exception (no stack traces leaked).

---

## 8. Deployment Settings (Render or Railway)

Settings required for human deployment on **Render** or **Railway**:

- **Build Command**: `pip install -r backend/requirements.txt`
- **Start Command**: `python -m uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT`
- **Health Check Path**: `/api/health`
- **Environment Variables**:
  - `CORS_ORIGINS`: Set to the deployed frontend URL (e.g., `https://tsukuyomi-watch.vercel.app` or custom domain).
  - `RESTORE_BACKEND`: `baseline`

> [!NOTE]
> Free tiers sleep on inactivity; the initial cold-start request can take about a minute.
