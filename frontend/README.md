# Tsukuyomi Watch: frontend

React + Vite single-page app for Tsukuyomi Watch. It talks only to the backend API described in
[`docs/api-contracts.md`](../docs/api-contracts.md).

## Requirements

- Node.js 20.19+ or 22.12+ (required by Vite 8) and npm
- For live data: the backend running locally (see below)

## Setup

```bash
cd frontend
npm ci                  # installs exactly what package-lock.json lists
cp .env.example .env    # then edit .env if needed
```

## Environment variables

Vite reads these from `frontend/.env` **at build time** (restart `npm run dev` after changing them).
Never commit `.env`; only `.env.example` is tracked.

| Variable | Default in `.env.example` | Meaning |
|---|---|---|
| `VITE_API_BASE_URL` | `http://localhost:8000` | Backend base URL, no trailing slash |
| `VITE_USE_MOCK` | `false` | `true` = use built-in MOCK responses instead of calling the API |

With `VITE_USE_MOCK=true` the header shows **"MOCK MODE: sample data, not live"** and every data
block carries a MOCK badge. Mock responses live in `src/services/mock.js` and are copied from the
API contract.

## Run (development)

```bash
# terminal 1, from the repo root: start the backend
python -m uvicorn backend.app.main:app --reload --port 8000

# terminal 2
cd frontend
npm run dev             # http://localhost:5173
```

The backend allows CORS from `http://localhost:5173` by default, so use that port.
If the backend is not running, each card shows "Cannot reach the server" with a Retry button.

## Build

```bash
npm run build           # production build into frontend/dist
npm run preview         # serve the built files locally
npm run lint            # oxlint
```

## Demo path

1. **Dojo Dashboard** (landing): backend health, Night Honor Score for the chosen location, next 3 events, shortcut to Spirit Lens
2. **Watchtower**: pick a viewing spot on the map or the list, or press "Use my location", to load its weather; the Dashboard then uses that location
3. **Celestial Scroll**: filter events by type and start date
4. **Spirit Lens**: upload a JPEG/PNG (max 10 MB, 32–2048 px per side), press **Restore** to compare original and restored with the slider and zoom, then **Find candidate sources** to see the overlay and table

## Project structure

```
src/
  App.jsx               shell: header, navigation, section switching (no router)
  sections/             DojoDashboard, Watchtower, CelestialScroll, SpiritLens
  components/           Card, StatusBadge, Loading, ErrorBox, EmptyState, NavBar,
                        WeatherCard, LocationMap, CompareSlider, DetectionOverlay, MoonMotif
  hooks/                useApiGet (GET + abort stale), useApiPost (uploads + elapsed time)
  services/api.js       apiGet / apiPostFile; errors are thrown as {error: {code, message}}
  services/mock.js      MOCK responses from the API contract
  lib/                  date formatting, default place, Leaflet icon fix
```

## Data honesty

- Every data block shows where it came from: LIVE, MOCK, CURATED or COMPUTED (from `data_kind`).
- Restored images and detections are **candidates**, not facts; Spirit Lens always shows this notice.
- The frontend never invents events or values; missing values are shown as "not available".
