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

## Deploy (done by a human; AI assistants never deploy)

The frontend is a static site. Deploy the backend first so you know its public HTTPS URL.

**Vercel**

| Setting | Value |
|---|---|
| Framework preset | Vite |
| Root Directory | `frontend` |
| Install Command | `npm ci` |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Environment variable | `VITE_API_BASE_URL` = `https://<your-backend-host>` (no trailing slash) |
| Node.js version | 22.x |

**Netlify**

| Setting | Value |
|---|---|
| Base directory | `frontend` |
| Build command | `npm run build` |
| Publish directory | `dist` (relative to the base directory; the UI shows `frontend/dist`) |
| Environment variables | `VITE_API_BASE_URL` = `https://<your-backend-host>`, `NODE_VERSION` = `22` |

Things that matter:

- **`VITE_API_BASE_URL` is baked in at build time.** If it is missing, the app calls `/api/...` on
  its own domain and every card shows an error. After changing it, trigger a new deploy (rebuild);
  changing it alone does nothing to the existing build.
- Leave `VITE_USE_MOCK` unset (or `false`) in production so real data is shown.
- Use the backend's **https** URL; browsers block http API calls from an https page.
- Then set the backend's `CORS_ORIGINS` to the deployed frontend URL (e.g. `https://tsukuyomi-watch.vercel.app`,
  no trailing slash) and redeploy the backend.
- No rewrite rules are needed: the app has no client-side routes.
- Free backend tiers sleep; the first request after a while can take 30+ seconds, so open the
  site once before a demo.

After deploying, check: the Dashboard shows `Backend status: ok` with a LIVE badge, the Night Honor
Score shows LIVE, and the browser console has no CORS errors.

## Demo path

1. **Observatory** (home): tonight's moon, Night Honor Score, sky conditions, next major event, best nearby spot, recent Spirit Lens activity
2. **Watchtower**: search, sort (score, distance, cloud cover) and filter by radius; switch between map and list; open a spot for its score gauge and conditions; save favourites (kept in this browser); "Use my location" measures distances from you
3. **Celestial Scroll**: filter events by type and start date
4. **Spirit Lens**: upload a JPEG/PNG (max 10 MB, 32–2048 px per side), press **Restore** to compare original and restored with the slider and zoom, then **Find candidate sources** to see the overlay and table
5. **Dojo**: history of the Spirit Lens runs made in this browser

## Project structure

```
src/
  App.jsx               shell: pages list, hash routes (#/watchtower), settings, focus handling
  pages/                Observatory (home), Watchtower, CelestialScroll, SpiritLens, Dojo (+ one CSS file each)
  components/
    layout/             Navigation (sidebar + mobile bars), Atmosphere background, Logo, SettingsDialog
    ui/                 Card, StatusBadge, MetricCard, Skeleton, Loading, ErrorBox, EmptyState,
                        Unavailable, Dialog, Toast (+ ui.css)
    astronomy/          MoonPhase (SVG), ScoreGauge
    weather/            WeatherCard
    maps/               LocationMap (Leaflet)
    image/              CompareSlider, DetectionOverlay
  hooks/                useApiGet, useApiPost, useLocationScores, useHashRoute, usePersistentState, useNow
  services/api.js       apiGet / apiPostFile; errors are thrown as {error: {code, message}}
  services/mock.js      MOCK responses from the API contract
  lib/                  moon phase maths, score bands, date formatting, places, activity history
  styles/               tokens.css (colours, type, spacing, motion, layers) and base.css
```

Pages are addressed by hash URLs (`/#/watchtower`), so the Back button and shared links work and
static hosts need no rewrite rules. Icons come from `lucide-react`.

## Data honesty

- Every data block shows where it came from: LIVE, MOCK, CURATED or COMPUTED (from `data_kind`).
- Restored images and detections are **candidates**, not facts; Spirit Lens always shows this notice.
- The frontend never invents events or values; missing values are shown as "not available".
- Features the API does not provide yet (for example moonrise and moonset) say so instead of showing made-up data.
- The moon phase on the home page is computed in the browser with the same approximate method as the backend, and is labelled COMPUTED.
