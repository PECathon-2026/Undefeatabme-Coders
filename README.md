# 🌙 Tsukuyomi Watch (月読)

> **Japanese-themed astronomy web app for stargazers, astrophotographers, and celestial observers.**  
> Built for PECathon 2026 by team **Undefeatabme-Coders**.

Tsukuyomi Watch connects real-time atmospheric data with ancient Japanese night-sky appreciation. It helps observers find clear skies, track upcoming astronomical events, and enhance deep-sky photos using algorithmic image processing.

---

## ⚡ Quickstart (How to Run Everything)

To run the complete web app locally, open **two separate terminal windows** (one for backend, one for frontend).

### 1. Prerequisites
- **Git**
- **Python 3.11, 3.12, or 3.13**
- **Node.js (v18+) & npm**

---

### 2. Terminal 1: Start the Backend (FastAPI on Port 8000)

```powershell
# From the repository root:

# Windows (PowerShell):
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r backend\requirements.txt -r backend\requirements-dev.txt
python -m uvicorn backend.app.main:app --reload --port 8000

# macOS / Linux (Bash):
python3 -m venv .venv
source .venv/bin/activate
python3 -m pip install -r backend/requirements.txt -r backend/requirements-dev.txt
python3 -m uvicorn backend.app.main:app --reload --port 8000
```

> **Backend is ready when**: [http://localhost:8000/api/health](http://localhost:8000/api/health) returns `{"status":"ok"}`.  
> **Interactive API Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)

---

### 3. Terminal 2: Start the Frontend (Vite + React on Port 5173)

```powershell
# From the repository root:
cd frontend

# Ensure .env is present (contains VITE_API_BASE_URL=http://localhost:8000):
# Windows:
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
# macOS / Linux:
cp -n .env.example .env 2>/dev/null || true

# Install dependencies and launch:
npm install
npm run dev
```

> **Open in your browser**: 👉 **[http://localhost:5173](http://localhost:5173)**

---

## 🌌 Feature Walkthrough

### 1. Dojo Dashboard
The central command deck:
- Live backend connection and status indicator.
- **Night Honor Score** gauge for Chandigarh and surrounding observation spots.
- Sky transparency, cloud cover %, relative humidity %, and calculated lunar phase.
- Live shortcut feeds to upcoming celestial events.

### 2. Watchtower (Interactive Map & Weather)
- **Interactive Leaflet Map**: Curated candidate stargazing spots near Chandigarh and Punjab (Sukhna Lake, Siswan Dam, Mirzapur Dam, Jayanti Dam, Morni Hills, Kaushalya Dam, Ropar Wetland).
- **Real-Time Meteorology**: Direct integration with Open-Meteo providing cloud cover %, humidity %, and visibility (km).
- **Night Honor Score Formula**: Evaluates atmospheric transparency based on weighted clear sky, dryness, and visibility factors.

### 3. Celestial Scroll (Events Calendar)
- **Comprehensive 90-Day Timeline**:
  - **Moon Phases**: Locally computed mathematical synodic periods.
  - **Meteor Showers**: Verified peak dates and radiants from the International Meteor Organization (IMO).
  - **Eclipses**: Verified solar and lunar eclipses from NASA GSFC tables.
  - **Rocket Launches**: Live upcoming orbital missions from Launch Library 2.
- Fully filterable with native IANA timezones and offsets.

### 4. Spirit Lens (Astrophotography Enhancement)
- **Client-Side Drag & Drop**: Accepts astronomical JPEG/PNG images up to 10 MB.
- **Algorithmic Restoration (`POST /api/restore`)**:
  - Denoises sensor grain using OpenCV Non-Local Means & mild unsharp masking without hallucinating synthetic stars.
  - Interactive comparison slider and zoom viewport.
- **Candidate Star Detection (`POST /api/detect-objects`)**:
  - Computes intensity-weighted centroid positions and relative peak brightness.
  - Renders precise interactive SVG overlays with pixel coordinate inspection.

---

## 🛠️ Tech Stack & Architecture

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, Vite, Leaflet, Plain CSS (Tokens & Glassmorphism Theme) |
| **Backend** | FastAPI, Uvicorn, Pydantic v2, HTTPX, Pillow, OpenCV Headless, NumPy |
| **Data & APIs** | Open-Meteo (Weather), Launch Library 2 (Launches), IMO & NASA (Eclipses & Meteors) |
| **Testing** | Pytest, FastAPI TestClient (105+ unit & integration tests) |

---

## 🔧 Troubleshooting

- **PowerShell Execution Policy**: If `.venv\Scripts\Activate.ps1` gives an execution error, run once:
  ```powershell
  Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
  ```
- **"Server returned a response that is not valid JSON"**:
  Make sure your backend is running in terminal 1 on port 8000 and `frontend/.env` has `VITE_API_BASE_URL=http://localhost:8000`.
- **`'vite' is not recognized`**:
  Make sure to run `npm install` inside the `frontend/` folder.

---

## 📜 Ethical Astronomy Notice

- **Originals are Never Modified**: Uploaded astronomical images are processed purely in-memory and never stored on disk.
- **Enhancement vs. Discovery**: Restored images and detected sources are labeled **"candidates"**, not scientific cataloged discoveries.
- **Curated Locations**: Geographic locations are sourced from open cartography; always verify local regulations, accessibility, and night-time safety before visiting.
