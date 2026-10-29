# Tsukuyomi Watch - Team Playbook v2

PS-002 | 3 members: Frontend, Backend, AI | Repo: github.com/PECathon-2026/Undefeatabme-Coders | Written 30 Oct 2026

**Part 1 (this playbook)** is the current plan, task list and paste-ready prompts. **Part 2** (appended in the PDF) is the original handoff, unchanged. **Where Part 1 and Part 2 disagree, Part 1 wins.**


### How to use this

- Save `PLAYBOOK.md` (supplied with this PDF) into the repo as `docs/PLAYBOOK.md`. AI assistants read markdown far better than PDF. Give the PDF to any AI that is outside VS Code.
- Each member finds their own section: Frontend (section 6), Backend (section 7), AI (section 8).
- Open Copilot Chat in Agent mode (or your own AI). Paste the role's **Session Prompt** once, then paste the **task prompts** one at a time, in order. Do the next task only when the previous PR is merged.
- The AI never commits or pushes by itself. It shows the diff, you approve, then it runs the git commands on your own branch.


### Problems found in the earlier setup, and how this playbook fixes them

| Problem | Fix (where) |
|---|---|
| No .gitignore: .venv and node_modules could be committed | Shared setup task M0 adds one (Appendix B) |
| CODEOWNERS still has placeholder usernames | M0 replaces them with the real three (Appendix B) |
| Backend and AI had no agreed code interface | Fixed interface: routes call ai/service.py (section 4) |
| AI model choice was left undecided | Decided: baseline first, models time-boxed (section 8) |
| torch would break a free deployment | Split requirements: core vs requirements-ai.txt (section 4) |
| Restore response format was vague | Full JSON contract with error shape (Appendix A) |
| Branches reused after merge cause conflicts | Rule: one branch per task, new branch from fresh main |
| One PC keeps the repo inside OneDrive | Move it to C:\dev (section 3); OneDrive syncs node_modules badly |
| Different Python versions break wheels | Everyone uses Python 3.11 or 3.12 (section 3) |
| Windows gotchas (PowerShell policy, tzdata, multipart) | Listed and pre-fixed in tasks and Appendix C |
| Original master prompt says 'inspect repo first' | Replaced by the role Session Prompts below |


## 1. Current state and roles

`main` already has: AGENTS.md, .github/CODEOWNERS, docs/api-contracts.md (small starter), backend/__init__.py, backend/app/__init__.py, backend/app/ai/NOTES.md (empty). Backend member is on `feature/health-endpoint`. Frontend and AI members create their first branch in their first task.

| Role | First branch | Owns (may edit) | Never touches |
|---|---|---|---|
| Frontend | feature/frontend-shell | frontend/ | backend/, docs/, AGENTS.md, .github/ |
| Backend | feature/health-endpoint | backend/app/ (except ai/), backend/tests/, backend/requirements.txt, backend/requirements-dev.txt | frontend/, backend/app/ai/ |
| AI | feature/ai-restoration | backend/app/ai/, backend/requirements-ai.txt | everything else |
| Shared (via PR only) | chore/shared-setup | docs/, AGENTS.md, README.md, .gitignore, .env.example, .github/ | - |

**Integration owner** is not a fourth role. It is a hat worn by the team leader (one of the three). Duties: do M0, review and merge PRs, run the smoke test after each merge, add CI, set branch protection, run deployment and the final demo check (section 9).


### Who is who (fill in once, keep in docs/PLAYBOOK.md)

| Role | GitHub username | Name |
|---|---|---|
| Frontend | Pranay9526 | Pranay |
| Backend | 38bharatkaushik8-maker | Bharat |
| AI | lakshaydoon48-sudo | Laksh |
| Integration owner (hat) | 38bharatkaushik8-maker | Bharat |

Confirmed by the team: Bharat is Backend and also the team leader (integration owner), Laksh is AI, Pranay is Frontend. If roles change, edit this table, the O1 prompt and CODEOWNERS.


## 2. Rules for all three humans and all three AIs

- Work only in your own folders (table above). Need a change elsewhere? Ask the owner, or open a PR they approve.
- **One branch per task.** After a PR is merged, never reuse that branch. Start the next task with a new branch from fresh `main`.
- Commit small. Stage only named files. Never `git add .` or `git add -A`.
- The AI shows `git diff --stat` and test results first. You approve. Only then commit and push to your own branch.
- Forbidden for AIs: git init, force-push, hard reset, changing remotes, deleting branches, merging, deploying, committing secrets.
- Never commit .env, .venv, node_modules, model weights, uploaded images or outputs. Keys live only in local environment variables.
- Mock data is always labelled MOCK. Sample values are never called live data.
- Restored images and detections are 'candidates', never facts. No star identity, physical size or calibrated brightness claims.
- Merge PRs with 'Squash and merge'. Someone other than the author reviews and merges.


### Daily loop (everyone)

```
git switch main
git pull --ff-only
git switch <your-branch>          # first time for a new task: git switch -c feature/<task-name>
git merge main                    # skip on a brand-new branch
# ...work with your AI, run checks...
git status
git diff --stat
git add <only the files you changed>
git commit -m "feat(<area>): short message"
git push -u origin <your-branch>
# then open a Pull Request into main on GitHub
```


### When something goes wrong

| Symptom | Do this |
|---|---|
| git pull --ff-only fails | You committed on main. Stop. Do not force anything. Ask the integration owner. |
| Merge conflict | Run git merge --abort to go back. Ask the owner of that file. Never resolve blindly. |
| Committed wrong files, not pushed | git reset --soft HEAD~1 (keeps your changes), then stage correctly. |
| Secret committed or pushed | Revoke the key at the provider first, then ask the owner how to clean history. |
| git switch says invalid reference | Branch does not exist yet. Use git switch -c <name> once. |


## 3. One-time setup on each PC (do before task 1)

- Install Python **3.11 or 3.12** (same on all three PCs), Node.js LTS, Git, VS Code.
- Move the repo out of OneDrive if it is there (one PC is). Example: `git clone https://github.com/PECathon-2026/Undefeatabme-Coders.git C:\dev\Undefeatabme-Coders`, open that folder in VS Code, then delete the OneDrive copy only after confirming nothing there is unpushed (`git status`, `git log origin/main..HEAD`).
- PowerShell blocks venv activation by default. Run once: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.
- Check versions: `python --version`, `node --version`, `git --version`. If `python` is not found, use `py -3.12`.
- In VS Code: install GitHub Copilot and Copilot Chat, sign in, open Chat, choose Agent mode. Recent versions read AGENTS.md automatically; the prompts below also tell the AI to read it, so it works either way. Keep approval prompts ON for terminal and git actions.


## 4. Interfaces that stop clashes


### Backend files and AI files are connected by one Python interface

The AI member writes `backend/app/ai/service.py`. The Backend member's routes import and call it. Neither edits the other's folder. Signatures are fixed:

```
# backend/app/ai/service.py   (written by AI member, called by backend routes)
class ImageValidationError(ValueError):
    code: str   # invalid_image | unsupported_type | file_too_large | image_too_large

def restore_image(data: bytes) -> dict:
    # {"png_bytes": bytes, "width": int, "height": int, "model_name": str,
    #  "model_license": str, "runtime_ms": int, "warnings": list[str]}

def detect_sources(data: bytes) -> dict:
    # {"image_width": int, "image_height": int, "method": str, "count": int,
    #  "sources": [{"id": int, "x": float, "y": float,
    #               "peak_brightness": float, "approx_size_px": float}],
    #  "warnings": list[str]}
```

Both functions raise `ImageValidationError` for bad input and are stateless (nothing written to disk). Backend maps codes to HTTP: invalid_image 422, unsupported_type 415, file_too_large 413, image_too_large 422.


### Limits (MVP)

- Upload: JPG or PNG only, at most 10 MB, at least 32 px and at most 2048 px per side. FITS is a stretch goal after M6; the MVP rejects it with a clear message.
- Pixel coordinates in detection results use the original image size, origin top-left, x to the right, y downward.
- `peak_brightness` is a normalised pixel value from 0 to 1, not calibrated brightness.


### Requirements split

- `backend/requirements.txt` (Backend owns): fastapi, uvicorn[standard], httpx, python-multipart, pillow, numpy, opencv-python-headless, tzdata.
- `backend/requirements-dev.txt` (Backend owns): pytest.
- `backend/requirements-ai.txt` (AI owns): optional heavy packages (photutils, astropy, scipy, torch notes). A deployed backend must work with only requirements.txt, so the baseline restore and detect use OpenCV and NumPy only.


### Environment variables

- `CORS_ORIGINS` (backend): comma-separated allowed origins. Default http://localhost:5173,http://127.0.0.1:5173.
- `RESTORE_BACKEND` (backend/AI): `baseline` (default) or `model`.
- `VITE_API_BASE_URL`, `VITE_USE_MOCK` (frontend): see `.env.example`.


## 5. Milestones (in order)

| # | Goal | Frontend | Backend | AI |
|---|---|---|---|---|
| M0 | Shared setup | - | - | -  (integration owner does it) |
| M1 | Health round trip | F1 | B1 | A1 branch + package |
| M2 | Contracts and mocks | F2 | B2 stub endpoints | A1 baseline service |
| M3 | Weather and map | F3 | B3 | A2 model evaluation |
| M4 | Events | F4 | B4 | A2 continues |
| M5 | Restore and detect | F5 | B5 | A3 detection upgrade |
| M6 | Dashboard, tests, CI | F6 | B6 | A4 hardening and docs |
| M7 | Deploy and demo | F7 | B7 | A5 demo kit |

A1 (baseline service) must be merged before B5 starts. Everything else can run in parallel. After every merge the integration owner runs the smoke test (O2).


## Integration owner: M0 and ongoing prompts

Done by whichever member wears the integration hat, on branch `chore/shared-setup`. First save `PLAYBOOK.md` into `docs/PLAYBOOK.md` by hand. Appendices A and B inside it hold the exact file contents. This is the only task where an AI may edit shared files.


### O1 - shared setup (M0)

```
You are my coding assistant. I am the integration owner of a 3-person hackathon team
(repo PECathon-2026/Undefeatabme-Coders). Read AGENTS.md and docs/PLAYBOOK.md fully first.
Task: create branch chore/shared-setup from fresh main (git switch main, git pull --ff-only,
git switch -c chore/shared-setup). Edit ONLY these files:
1. .gitignore  - exactly as in PLAYBOOK Appendix B.
2. .env.example - exactly as in Appendix B.
3. .github/CODEOWNERS - Appendix B version, replacing the placeholders with these usernames (already set below):
   FRONTEND=Pranay9526, BACKEND=38bharatkaushik8-maker, AI=lakshaydoon48-sudo, LEADER=38bharatkaushik8-maker.
4. AGENTS.md - replace the Ownership section with the version in Appendix B, keep the other
   sections.
5. docs/api-contracts.md - replace with the full contract in Appendix A, unchanged.
Do not touch frontend/ or backend/. Show me git status and git diff --stat, then wait for my
approval before commit. Commit message: "chore: shared setup (gitignore, owners, contract)".
After my approval, push the branch and give me the PR title and description.
Do not merge. Never git add . or git add -A; stage the five files by name.
```


### O2 - smoke test after every merge

```
You are my assistant. I am the integration owner. Read AGENTS.md and docs/PLAYBOOK.md.
Do not edit any file. Task: on fresh main verify the app works end to end.
Run: git switch main, git pull --ff-only. Backend: create or reuse .venv, install
backend/requirements.txt, run python -m uvicorn backend.app.main:app --port 8000 (new
terminal), then check GET /api/health, /api/weather?lat=30.7333&lon=76.7794, /api/locations,
/api/events. Run python -m pytest backend if tests exist. Frontend: cd frontend, npm ci (or
npm install), npm run build. Report a table: check, command, pass or fail, error text.
For each failure name the owner (Frontend, Backend or AI) and the likely file. Fix nothing.
```


### O3 - branch protection and CI (after M2)

- GitHub repo -> Settings -> Branches -> add rule for `main`: require a pull request, require 1 approval, require review from Code Owners. Menus vary slightly by GitHub version.
- After both the backend (with at least one test) and the frontend (with package-lock.json) are merged, add `.github/workflows/ci.yml` from Appendix B through a PR. It fails on an empty project, so do not add it earlier.


## 6. FRONTEND member

Owns `frontend/`. Branches: one per task, first is `feature/frontend-shell`. Stack: React + Vite + plain CSS, Leaflet. Build every screen against `docs/api-contracts.md` using mock data first, then switch on the real API.


### Session Prompt (paste first, once per session)

```
You are my coding assistant. I am the FRONTEND member of a 3-person hackathon team building
"Tsukuyomi Watch", a Japanese-themed astronomy web app (dark ink-wash, black, red, gold, moon
motifs). Repo: PECathon-2026/Undefeatabme-Coders.
1. Read AGENTS.md, docs/PLAYBOOK.md and docs/api-contracts.md fully before doing anything.
2. You may edit ONLY files inside frontend/. Never edit backend/, docs/, AGENTS.md, .github/.
3. Run git status and git branch and tell me my branch. Work only on the branch I name.
4. Git: no git init, force push, hard reset, remote changes, branch deletion, merge, deploy.
   Never commit or push until you show me git diff --stat and I say OK. Stage files by name
   only (never git add . or git add -A).
5. Never commit .env, node_modules or secrets. Mock data must be labelled MOCK in the UI.
6. After each task run npm run build (must pass), list changed files and wait for my approval.
Reply now with: current branch, repo state, and the first task you will do. Do not code yet.
```


### F1 - Vite app and health check (M1)

```
Task F1, branch feature/frontend-shell (create with git switch -c if it does not exist).
If frontend/ does not exist: from the repo root run npm create vite@latest frontend --
--template react. If it asks about experimental or rolldown options answer No, and answer No
to "install and start now". Then cd frontend and npm install. Do not touch the repo root files.
Create frontend/.env.example with VITE_API_BASE_URL=http://localhost:8000 and
VITE_USE_MOCK=false. Create src/services/api.js exporting apiGet(path) and apiPostFile(path,
file) that use import.meta.env.VITE_API_BASE_URL, return parsed JSON, and on failure throw an
object shaped {error:{code,message}} (use code "network_error" when the server is unreachable).
App.jsx shows the text "Backend status: <value>" from GET /api/health; if unreachable show
"BACKEND OFFLINE (MOCK)". Done when npm run build passes and the page shows "ok" with the
backend running. Make sure frontend/package-lock.json is committed. Do not commit node_modules.
Show me git status and diff --stat, wait for approval, then commit "feat(frontend): vite shell
and health check", push the branch and give me the PR text.
```


### F2 - theme, shell and mock data (M2)

```
Task F2. New branch from fresh main: feature/frontend-theme. Build the app shell in
frontend/src, plain CSS with CSS variables: ink black #0b0b0f, panel #14141a, red #b3202a,
gold #d4af37, paper #e8e2d0. Add a header with a moon SVG motif and four sections switched by
useState (no router): Watchtower, Celestial Scroll, Spirit Lens, Dojo Dashboard. Components:
NavBar, Card, StatusBadge (LIVE or MOCK, based on data_kind), Loading, ErrorBox (shows
error.message and a Retry button), EmptyState. Create src/services/mock.js with sample
responses copied EXACTLY from docs/api-contracts.md (data_kind "mock"). In api.js, when
VITE_USE_MOCK is "true" return the mock data (with a small delay) instead of calling the API.
Accessibility: semantic landmarks, visible focus outlines, contrast, works from 360px wide.
Placeholder text in each section is fine. Done when npm run build passes and every section
renders in mock mode. Same approval and commit rules as before.
```


### F3 - Watchtower: weather card and map (M3)

```
Task F3. New branch from fresh main: feature/frontend-watchtower. Run npm install leaflet
react-leaflet (react-leaflet 5 matches React 19; if the template uses React 18 install
react-leaflet@4 instead). Import leaflet/dist/leaflet.css, give the map container a fixed
height (about 420px), keep the OSM tile attribution. Fix the known Vite problem with missing
default marker icons by importing marker-icon.png, marker-icon-2x.png and marker-shadow.png
from leaflet/dist/images and setting L.Icon.Default options. Fetch GET /api/locations and show
markers; clicking a marker (or a "Use my location" button using navigator.geolocation) calls
GET /api/weather?lat=&lon= and fills a weather card: cloud cover %, humidity %, visibility km
(show "not available" when null), Night Honor Score big, score_method in an expandable
"How is this scored?" section, timestamp shown in the response timezone, the attribution text,
and a LIVE or MOCK badge. Show the locations disclaimer from the API. Use AbortController to
cancel stale requests. Handle loading, error and empty states. Same approval and commit rules.
```


### F4 - Celestial Scroll: events (M4)

```
Task F4. New branch from fresh main: feature/frontend-events. Build the Celestial Scroll
section using GET /api/events?type=&date=. Controls: a type select (all, moon_phase,
meteor_shower, eclipse, launch) and a date input (YYYY-MM-DD, default today). Show a list of
cards: title, type icon or label, start time formatted with Intl.DateTimeFormat in the event's
own timezone field, source, description, and a LIVE, MOCK or CURATED badge from data_kind.
Show any warnings array returned by the API (for example "launches unavailable") in a notice
bar. Handle loading, error, empty ("no events in this range") and re-fetch when filters
change. Do not invent events on the client. Same approval and commit rules.
```


### F5 - Spirit Lens: upload, slider, overlays (M5)

```
Task F5. New branch from fresh main: feature/frontend-spirit-lens. Build the Spirit Lens
section. Upload: file input accepting .jpg,.jpeg,.png, client-side check of size (max 10 MB)
and type with friendly messages, preview via URL.createObjectURL (revoke it on cleanup). Button
"Restore" calls POST /api/restore using multipart with field name "file". Show the API
warnings text prominently. Show a before/after comparison slider built by hand: two stacked
images, the top one clipped with clip-path, plus an <input type="range"> so it works with the
keyboard and touch; add a zoom range control. Original = the local file preview, After = the
restored_image data URL. Button "Find candidate sources" calls POST /api/detect-objects with
the same file (field "file") and draws an SVG overlay of circles on the image. Coordinates are
in original pixel units: scale by displayedWidth / image_width and update with ResizeObserver.
Show a table of candidates (id, x, y, peak_brightness, approx_size_px). Always display the
notice: "Candidates only. Restoration is algorithmic enhancement and can create artefacts. Not
a scientific measurement." Handle loading (with spinner and elapsed time), 413, 415, 422 and
network errors using error.message. In mock mode use the mock restore (return the same image).
Same approval and commit rules.
```


### F6 - Dojo Dashboard and polish (M6)

```
Task F6. New branch from fresh main: feature/frontend-dashboard. Build the Dojo Dashboard as
the landing view: backend health indicator, current Night Honor Score for the selected or
default location, the next 3 events, and a shortcut button to Spirit Lens. Add a visible
LIVE or MOCK indicator for every data block. Polish: responsive layout at 360, 768 and 1280
px, keyboard navigation, focus states, reduced-motion respect for any animation, no console
errors, no leftover console.log. Write frontend/README.md with run, build and env instructions.
Done when npm run build passes and the demo path works: dashboard, select location, weather
and events, upload, restore, compare, overlays. Same approval and commit rules.
```


### F7 - production build check (M7)

```
Task F7. New branch from fresh main: feature/frontend-release. Do not deploy. Verify npm ci
and npm run build work from a clean state, that VITE_API_BASE_URL is read at build time, and
that no localhost URL is hardcoded anywhere in src. List the exact deploy settings a human
needs for Vercel or Netlify: root directory frontend, build command npm run build, output
directory dist, and the environment variable VITE_API_BASE_URL. Add them to frontend/README.md.
Same approval and commit rules.
```


## 7. BACKEND member

Owns `backend/app/` (except `ai/`), `backend/tests/`, `backend/requirements.txt`, `backend/requirements-dev.txt`. Run the API from the repo root: `python -m uvicorn backend.app.main:app --reload --port 8000`. Interactive docs at http://localhost:8000/docs.


### Session Prompt (paste first, once per session)

```
You are my coding assistant. I am the BACKEND member of a 3-person hackathon team building
"Tsukuyomi Watch", an astronomy web app. Repo: PECathon-2026/Undefeatabme-Coders.
1. Read AGENTS.md, docs/PLAYBOOK.md and docs/api-contracts.md fully before doing anything.
2. You may edit ONLY backend/app/ (NOT backend/app/ai/), backend/tests/,
   backend/requirements.txt and backend/requirements-dev.txt. Never edit frontend/,
   backend/app/ai/, docs/, AGENTS.md, .github/. The contract is fixed: if you think a field must
   change, stop and tell me so I can agree it with the others.
3. Run git status and git branch and tell me my branch. Work only on the branch I name.
4. Git: no git init, force push, hard reset, remote changes, branch deletion, merge, deploy.
   Never commit or push until you show me git diff --stat and test results and I say OK.
   Stage files by name only (never git add . or git add -A).
5. Never commit .env or secrets. Never present sample data as live. Tell me before adding any
   dependency not listed in the playbook.
6. After each task run python -m pytest backend (when tests exist) and the server, list changed
   files and wait for my approval.
Reply now with: current branch, repo state, and the first task you will do. Do not code yet.
```


### B1 - FastAPI skeleton, health, errors (M1)

```
Task B1, branch feature/health-endpoint (it already exists on my PC: git switch it, then
git merge main). Create backend/requirements.txt with: fastapi, uvicorn[standard], httpx,
python-multipart, pillow, numpy, opencv-python-headless, tzdata. Create
backend/requirements-dev.txt with pytest. Create backend/app/main.py: FastAPI(title=
"Tsukuyomi Watch"); CORS middleware reading CORS_ORIGINS (comma separated, default
http://localhost:5173,http://127.0.0.1:5173), methods GET and POST, header Content-Type;
GET /api/health returning {"status":"ok"}. Add backend/app/errors.py with exception handlers so
EVERY error uses the shape {"error":{"code":"...","message":"..."}}, including FastAPI
validation errors (override RequestValidationError, code "invalid_parameter", status 422) and
unexpected exceptions (500, code "internal_error", no stack trace in the message). Create empty
__init__.py in routes/, services/, schemas/ and tests/. Add backend/tests/test_health.py using
fastapi.testclient.TestClient. Windows: python -m venv .venv, then .\.venv\Scripts\Activate.ps1,
python -m pip install -r backend\requirements.txt -r backend\requirements-dev.txt. Run
python -m uvicorn backend.app.main:app --reload --port 8000 and check /api/health and /docs.
Done when pytest passes and health works. Same approval and commit rules.
```


### B2 - stub endpoints and schemas (M2)

```
Task B2. New branch from fresh main: feature/api-stubs. Create Pydantic models in
backend/app/schemas/ for every response in docs/api-contracts.md and use them as
response_model so /docs shows the contract. Create routes in backend/app/routes/ and include
them in main.py: /api/weather, /api/locations, /api/events return the sample responses from the
contract with data_kind "mock" and source "sample". POST /api/restore and POST
/api/detect-objects return 501 with code "not_implemented" for now. Purpose: the frontend can
connect to real HTTP immediately. Validate lat -90..90 and lon -180..180 (422 invalid_parameter).
Add tests that every endpoint response validates against its schema. Same approval and commit
rules. Tell me when merged so the frontend can switch VITE_USE_MOCK to false.
```


### B3 - live weather, Night Honor Score, locations (M3)

```
Task B3. New branch from fresh main: feature/weather-live. Implement GET /api/weather with
Open-Meteo using httpx (timeout 8 s, one retry). First check the current Open-Meteo forecast
API docs to confirm parameter names: current cloud_cover and relative_humidity_2m, hourly
visibility (metres, convert to km, pick the hour matching the current time, null if missing),
and timezone=auto. Never invent values: if the upstream fails return 502 with code
"upstream_unavailable". Cache results in memory for 10 minutes keyed by lat and lon rounded to
2 decimals. Put the score in backend/app/services/score.py as a pure function:
score = round(0.6*(100-cloud) + 0.2*(100-humidity) + 0.2*min(vis_km,20)/20*100); when
visibility is null use weights 0.75 and 0.25 for cloud and humidity. Clamp 0..100. score_method
is the string in the contract. Add unit tests for the score (all-clear, overcast, null
visibility) and an endpoint test with the upstream mocked. Add backend/app/data/locations.json
with 5 to 8 curated candidate spots near Chandigarh and Punjab, each with id, name, lat, lon,
provenance, verified:false, data_kind "curated". Do not claim dark skies or safety; tell me to
check each coordinate on OpenStreetMap. /api/locations returns them plus the disclaimer.
Include the Open-Meteo attribution. Same approval and commit rules.
```


### B4 - events (M4)

```
Task B4. New branch from fresh main: feature/events-live. Implement GET /api/events?type=&date=
(type: all, moon_phase, meteor_shower, eclipse, launch; date YYYY-MM-DD default today in
Asia/Kolkata; window 90 days from date; sorted by start_time; ISO-8601 with offset plus an IANA
timezone field). Sources: (a) moon phases computed locally. Prefer the ephem package if it
installs cleanly on Windows (tell me before adding it); otherwise use the mean-lunation
formula and label it "approximate". (b) meteor showers and eclipses from
backend/app/data/events_static.json. Fetch the dates from official pages (International Meteor
Organization calendar, NASA eclipse pages), put the source URL and a verified_on date on every
entry, and leave out anything you cannot verify. Never fill dates from memory. (c) launches from
Launch Library 2 (thespacedevs.com): check the current API version and free-tier rate limit in
its docs, cache 30 minutes, and if it fails still return the other events plus a "warnings"
array item "launches unavailable". ISS passes and moonrise need location predictions and are out
of scope. Tests: filters, date window, and timezone offsets. Same approval and commit rules.
```


### B5 - restore and detect routes (M5, needs AI task A1 merged)

```
Task B5. First confirm backend/app/ai/service.py exists on main (git pull). If not, stop and tell
me. New branch from fresh main: feature/image-routes. Implement POST /api/restore and POST
/api/detect-objects (multipart field "file") with plain def route functions (CPU work runs in
the threadpool) that call restore_image and detect_sources from backend.app.ai.service. Read the
upload with a hard 10 MB cap (reject 413 file_too_large without reading more). Map
ImageValidationError codes to HTTP: invalid_image 422, unsupported_type 415, file_too_large 413,
image_too_large 422. Build the contract response: restored_image as "data:image/png;base64,..."
from png_bytes. Never write uploads to disk. Add a small in-memory rate limiter (10 image
requests per minute per client IP, 429 code "rate_limited", no new dependency). If importing the
AI service fails, return 501 not_implemented. Tests: valid tiny PNG generated in the test with
Pillow, corrupted bytes, wrong type, oversize, rate limit. Same approval and commit rules.
```


### B6 - hardening and tests (M6)

```
Task B6. New branch from fresh main: feature/backend-hardening. Review every endpoint against
docs/api-contracts.md and fix drift. Confirm all errors use the common shape, CORS works for a
configured production origin, logs contain no secrets or uploaded content, and timeouts exist
for all outbound calls. Raise test coverage on score, events filters, upload validation and error
shapes. Write backend/README.md with run, test and env instructions. Do not edit .github/ (the
integration owner adds CI). Same approval and commit rules.
```


### B7 - deployment readiness (M7)

```
Task B7. New branch from fresh main: feature/backend-release. Do not deploy. Verify a clean
install works with only backend/requirements.txt (no torch) and that RESTORE_BACKEND defaults
to baseline. Write in backend/README.md the exact settings a human needs for Render or Railway:
build command pip install -r backend/requirements.txt, start command python -m uvicorn
backend.app.main:app --host 0.0.0.0 --port $PORT, health check path /api/health, and env var
CORS_ORIGINS set to the deployed frontend URL. Note that free tiers sleep and the first request
can take about a minute. Same approval and commit rules.
```


## 8. AI member

Owns `backend/app/ai/` and `backend/requirements-ai.txt`. Never edits routes. Decisions made now so nobody waits: ship an OpenCV baseline first so the whole app works on any laptop, then evaluate pretrained models in a strict time box. Generative super-resolution can invent stars. Prefer denoising and deconvolution, and label every output as enhancement.


### Session Prompt (paste first, once per session)

```
You are my coding assistant. I am the AI member of a 3-person hackathon team building
"Tsukuyomi Watch", an astronomy web app. My part: astronomical image restoration and candidate
source detection. Repo: PECathon-2026/Undefeatabme-Coders.
1. Read AGENTS.md, docs/PLAYBOOK.md and docs/api-contracts.md fully before doing anything.
2. You may edit ONLY backend/app/ai/ and backend/requirements-ai.txt. Never edit routes,
   services, frontend/, docs/, AGENTS.md, .github/. The Python interface in PLAYBOOK section 4
   (ai/service.py: restore_image, detect_sources, ImageValidationError) is fixed.
3. Run git status and git branch and tell me my branch. Work only on the branch I name.
4. Git: no git init, force push, hard reset, remote changes, branch deletion, merge, deploy.
   Never commit or push until you show me git diff --stat and test results and I say OK.
   Stage files by name only (never git add . or git add -A).
5. Never commit model weights, sample images, outputs or secrets (they are gitignored). Never
   claim star identity, physical size or calibrated brightness. Always preserve the original.
6. Tell me before adding any dependency. Core code may use only pillow, numpy and
   opencv-python-headless. Anything heavier goes in backend/requirements-ai.txt and must be
   optional with a fallback to the baseline.
7. After each task run python -m pytest backend/app/ai, list changed files and wait for approval.
Reply now with: current branch, repo state, and the first task you will do. Do not code yet.
```


### A1 - package and baseline service (M1 to M2, highest priority)

```
Task A1. Create branch feature/ai-restoration with git switch -c (it may not exist yet) from
fresh main. Create in backend/app/ai/: __init__.py, validation.py, restore_baseline.py,
detect.py, service.py, tests/test_service.py. Do not delete NOTES.md; fill it in A2.
validation.py: ImageValidationError(code, message). Accept only JPEG and PNG (detect with
Pillow, not the file name), max 10 MB, each side 32..2048 px, guard against decompression bombs
(Image.MAX_IMAGE_PIXELS), return a numpy array and keep 16-bit PNGs from being silently wrecked
(convert with care and note it in warnings). FITS or anything else: unsupported_type.
restore_baseline.py: gentle denoise with OpenCV (try fastNlMeansDenoisingColored or the
grayscale version for single-channel) followed by a mild unsharp mask. Keep the output the SAME
width and height as the input. Measure runtime on a 2048x2048 image and tune parameters so it
stays under about 10 s on CPU. detect.py: grayscale float 0..1, estimate background with a
large median or Gaussian blur, subtract, threshold at median + 5 robust sigma (MAD), label with
cv2.connectedComponentsWithStats, centroid by intensity-weighted moments, drop blobs under 2
px, keep the 200 brightest, sources sorted by peak_brightness, approx_size_px = equivalent
diameter in pixels, method "opencv-threshold-centroid". service.py implements EXACTLY the
signatures in PLAYBOOK section 4 and these warnings: "Restored image is an algorithmic
enhancement, not new data. Features may be artefacts." and "Detections are candidates, not
confirmed astronomical objects." Tests use synthetic images made with numpy (noisy background
plus Gaussian stars at known positions): detected positions within 2 px, invalid bytes raise
ImageValidationError, oversize rejected, output size equals input size. Commit no images. Done
when the tests pass. Show diff and results, wait for approval, then tell me to tell the Backend
member that service.py is ready to merge. Same git rules.
```


### A2 - model evaluation (M3 to M4, time-box about 3 hours total)

```
Task A2. New branch from fresh main: feature/ai-model-eval. Fill backend/app/ai/NOTES.md and
create backend/app/ai/benchmark.py (run by me locally). Candidates to evaluate: (1) the OpenCV
baseline, (2) Richardson-Lucy deconvolution with an assumed Gaussian PSF (scikit-image or
scipy), (3) at most TWO pretrained models, for example Real-ESRGAN and SwinIR. For each pretrained
model record from its official repository: licence of the code AND of the weights, where the
weights are downloaded from, hardware needs, CPU or GPU, model size. Use only models whose
licence permits our use. Do not download anything without telling me the URL and size. Weights
go in backend/app/ai/weights/ (gitignored); samples go in backend/app/ai/samples/ (gitignored);
record each sample's source URL and licence in NOTES.md. Install torch for CPU on Windows with
pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu and write that
command in NOTES.md, not in requirements-ai.txt. If a package fails with a torchvision import
error (basicsr is known to do this on new torchvision), do not patch site-packages: use the
model's own architecture file or pick another model. Test on 3 to 5 real astronomy images
(including a star field). Record in a table: runtime on CPU (and GPU if available), peak
memory, visual artefacts, stars added or removed. Decision rule: ship a pretrained model only if
the licence allows it, weights download by script or env path, CPU runtime is at most 30 s for a
1024 px image (or a GPU is guaranteed on demo day), AND it does not invent stars on the tests.
Otherwise the baseline stays the default. Implement a lazy singleton loader (load once, thread
lock) and RESTORE_BACKEND=baseline|model in service.py with automatic fallback to the baseline
on any model error. Same git rules.
```


### A3 - better source detection (M5)

```
Task A3. New branch from fresh main: feature/ai-detection. Add an optional detector using
photutils DAOStarFinder with astropy sigma_clipped_stats (add photutils, astropy, scipy to
backend/requirements-ai.txt; tell me first). Keep the same output schema, set method to
"photutils-daostarfinder", and fall back to the OpenCV detector when photutils is not
installed or raises. Compare both on your samples (count, positions, runtime) and record the
result and chosen defaults in NOTES.md. Keep coordinates in original pixel units, top-left
origin. peak_brightness stays normalised 0..1. Add tests with the synthetic star field. Same
git rules.
```


### A4 - hardening and documentation (M6)

```
Task A4. New branch from fresh main: feature/ai-hardening. Add input guards for memory and time
(reject early for oversize, never load huge arrays), make sure nothing is written to disk and
there are no temp files, and that errors from OpenCV or the model become ImageValidationError or a
clear RuntimeError message the backend can map. Finish NOTES.md with: chosen model and
licences, weights source, hardware needs, runtime table, limitations, how to reproduce with
benchmark.py, and the exact warning strings. Confirm that backend requirements.txt alone is
enough for baseline mode. Same git rules.
```


### A5 - demo kit (M7)

```
Task A5. New branch from fresh main: feature/ai-demo-kit. Write in NOTES.md a demo plan: which
3 sample images to use (names and licence), the expected before and after behaviour, expected
detection counts, how long each step takes on the demo laptop, and a fallback: if the hosted
backend is slow or down, run locally with RESTORE_BACKEND=baseline. Do not commit images.
Verify a fresh clone plus requirements.txt reproduces the baseline results. Same git rules.
```


## 9. Deployment and final check (integration owner, humans only)

- AIs must not deploy. A human does these steps.
- Backend on Render or Railway free tier: build `pip install -r backend/requirements.txt`, start `python -m uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT`, health check `/api/health`, env `CORS_ORIGINS=<frontend URL>`.
- Frontend on Vercel or Netlify: root `frontend`, build `npm run build`, output `dist`, env `VITE_API_BASE_URL=<backend URL>`. Then update backend `CORS_ORIGINS` with the final frontend URL.
- Free backends sleep. Open `/api/health` a minute before the demo.
- Fresh clone test: clone to a new folder, follow only the READMEs, run the smoke test (O2). Test the deployed URLs on a phone.
- Check attribution is visible (Open-Meteo, OpenStreetMap) and no sample value is labelled live.


### Demo script (from the original demo path)

- Open the Dojo Dashboard and show health plus LIVE badges.
- Pick a location on the Watchtower map and show real weather and the Night Honor Score method.
- Open the Celestial Scroll, filter by type and date, point out the source and time zone.
- Open the Spirit Lens, upload a prepared astronomy image, run restoration, drag the comparison slider.
- Run candidate source detection, show overlays and the 'candidates only' notice.
- Closing line: restoration is enhancement, not discovery.


## Appendix A - API contract (copy into docs/api-contracts.md)

Conventions: JSON, snake_case, ISO-8601 timestamps with offset, distances in km, percentages 0-100. Missing data is `null`, never 0. `data_kind` is `live`, `curated`, `mock` or `computed`. Errors always use the same shape.


### Error shape and codes

```
{"error": {"code": "invalid_image", "message": "File is not a valid JPEG or PNG image."}}
```

| code | HTTP | meaning |
|---|---|---|
| invalid_parameter | 422 | bad query or form parameter |
| invalid_image | 422 | file cannot be decoded as an image |
| unsupported_type | 415 | not JPEG or PNG (FITS rejected in MVP) |
| file_too_large | 413 | over 10 MB |
| image_too_large | 422 | side over 2048 px or under 32 px |
| rate_limited | 429 | too many image requests |
| upstream_unavailable | 502 | Open-Meteo or another source failed |
| not_implemented | 501 | endpoint not ready yet |
| internal_error | 500 | unexpected server error |


### GET /api/health

```
{"status": "ok"}
```


### GET /api/weather?lat=30.7333&lon=76.7794

```
{
  "location": {"lat": 30.7333, "lon": 76.7794, "name": null},
  "cloud_cover_percent": 23,
  "humidity_percent": 55,
  "visibility_km": 24.1,
  "night_honor_score": 75,
  "score_method": "v1: 0.6*clear_sky + 0.2*dryness + 0.2*visibility(capped 20 km); weights 0.75/0.25 if visibility is null; ignores moon and light pollution",
  "source": "Open-Meteo",
  "data_kind": "live",
  "timestamp": "2026-10-30T21:00:00+05:30",
  "timezone": "Asia/Kolkata",
  "attribution": "Weather data by Open-Meteo.com"
}
```

Score check: 0.6*77 + 0.2*45 + 0.2*100 = 75.2, rounded to 75. `visibility_km` may be null.


### GET /api/locations

```
{
  "locations": [
    {"id": "sukhna-lake", "name": "Sukhna Lake", "lat": 30.7421, "lon": 76.8188,
     "provenance": "Curated by the team from OpenStreetMap; NOT verified for light pollution, access or safety",
     "verified": false, "data_kind": "curated"}
  ],
  "disclaimer": "Weather cannot verify accessibility, safety or light pollution."
}
```


### GET /api/events?type=all&date=2026-11-01

```
{
  "events": [
    {"id": "sample-leonids", "type": "meteor_shower", "title": "Leonids (sample entry)",
     "start_time": "2026-11-17T00:00:00+05:30", "timezone": "Asia/Kolkata",
     "source": "sample", "description": "Sample only. Real entries carry a source URL.",
     "data_kind": "mock"}
  ],
  "query": {"type": "all", "date": "2026-11-01", "days": 90},
  "warnings": [],
  "generated_at": "2026-10-30T21:05:00+05:30"
}
```

`type` is one of `all`, `moon_phase`, `meteor_shower`, `eclipse`, `launch`. `date` defaults to today in Asia/Kolkata. Events are sorted by `start_time`.


### POST /api/restore  (multipart, field name: file)

```
{
  "restored_image": "data:image/png;base64,iVBORw0KGgo...",
  "width": 1024, "height": 768,
  "model_name": "opencv-nlmeans-unsharp-baseline",
  "model_license": "Apache-2.0 (OpenCV)",
  "runtime_ms": 2140,
  "data_kind": "computed",
  "warnings": ["Restored image is an algorithmic enhancement, not new data. Features may be artefacts."]
}
```

Width and height always equal the uploaded image. The original is never modified or stored; the frontend keeps its own copy.


### POST /api/detect-objects  (multipart, field name: file)

```
{
  "image_width": 1024, "image_height": 768,
  "method": "opencv-threshold-centroid",
  "count": 2,
  "sources": [
    {"id": 1, "x": 312.4, "y": 190.8, "peak_brightness": 0.93, "approx_size_px": 4.1},
    {"id": 2, "x": 640.0, "y": 455.2, "peak_brightness": 0.41, "approx_size_px": 3.2}
  ],
  "data_kind": "computed",
  "warnings": ["Detections are candidates, not confirmed astronomical objects."]
}
```

Pixel coordinates, origin top-left, original image size. `peak_brightness` is a normalised pixel value 0-1, not calibrated. At most 200 sources, brightest first.


## Appendix B - shared file contents (integration owner, task O1)


### .gitignore (repo root)

```
# secrets
.env
.env.*
!.env.example
# python
.venv/
__pycache__/
*.pyc
.pytest_cache/
# node
node_modules/
dist/
# editor and OS
.vscode/
.DS_Store
Thumbs.db
# AI artefacts: never commit
outputs/
backend/app/ai/samples/
backend/app/ai/weights/
*.pth
*.pt
*.onnx
*.ckpt
*.safetensors
```


### .env.example (repo root)

```
# Backend (set as environment variables, never commit real values)
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
RESTORE_BACKEND=baseline
# Frontend (copy into frontend/.env)
VITE_API_BASE_URL=http://localhost:8000
VITE_USE_MOCK=false
```


### .github/CODEOWNERS (the last matching line wins)

```
/backend/ @38bharatkaushik8-maker
/backend/app/ai/ @lakshaydoon48-sudo
/backend/requirements-ai.txt @lakshaydoon48-sudo
/frontend/ @Pranay9526
/docs/ @38bharatkaushik8-maker
/AGENTS.md @38bharatkaushik8-maker
/.github/ @38bharatkaushik8-maker
/.gitignore @38bharatkaushik8-maker
```

Usernames are already filled in. Change them if roles change; keep the `@`. Backend and leader share one username, so every PR by Bharat needs Pranay or Laksh to review it (GitHub will not let you approve your own PR). Reviews are only enforced once branch protection requires Code Owner review.


### AGENTS.md - replace the Ownership section with this

```
## Ownership (never edit outside your folder)
- Frontend: frontend/
- Backend: backend/app/ (except backend/app/ai/), backend/tests/,
  backend/requirements.txt, backend/requirements-dev.txt
- AI: backend/app/ai/, backend/requirements-ai.txt
- Shared (integration owner, PR only): docs/, AGENTS.md, README.md, .gitignore,
  .env.example, .github/
- docs/api-contracts.md changes need a PR approved by all three members.

## Interfaces
- Backend routes call backend/app/ai/service.py (restore_image, detect_sources).
  AI never edits routes. Backend never edits backend/app/ai/.
- Frontend only talks to the API described in docs/api-contracts.md.

## Branches
- One branch per task. After a PR is merged never reuse that branch.
- Task list and prompts: docs/PLAYBOOK.md. Use Python 3.11 or 3.12.
```


### .github/workflows/ci.yml (add only after backend tests and the frontend lockfile are merged)

```
name: CI
on:
  pull_request:
  push:
    branches: [main]
jobs:
  backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - run: pip install -r backend/requirements.txt -r backend/requirements-dev.txt
      - run: python -m pytest backend
  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
      - run: npm ci
        working-directory: frontend
      - run: npm run build
        working-directory: frontend
```

Action versions may have newer releases; keeping these is fine.


## Appendix C - PR review checklist and troubleshooting


### Reviewer checklist (someone other than the author)

- Only files in the author's own folders changed (see `git diff --stat`).
- No .env, .venv, node_modules, weights, sample images or outputs.
- Contract unchanged, or the change is intentional and all three agreed.
- Tests or `npm run build` pass; errors, loading and empty states handled.
- Mock data labelled MOCK; no sample value presented as live; attribution present.
- Small, scoped, clear description. Squash and merge, then everyone pulls main.


### Windows troubleshooting

| Problem | Fix |
|---|---|
| Activate.ps1 is blocked | Set-ExecutionPolicy -Scope CurrentUser RemoteSigned |
| python not found | Use py -3.12, or reinstall Python and tick 'Add to PATH' |
| ModuleNotFoundError: backend | Run from the repo root: python -m uvicorn backend.app.main:app |
| Port 8000 busy | Use --port 8001 and change VITE_API_BASE_URL |
| Vite moves to 5174 and CORS fails | Free port 5173 or add the 5174 origin to CORS_ORIGINS |
| CORS error in browser | localhost and 127.0.0.1 differ; add the exact origin to CORS_ORIGINS |
| 422 on upload | Form field must be named file; python-multipart must be installed |
| ZoneInfoNotFoundError | pip install tzdata (already in requirements.txt) |
| Blank Leaflet map | Import leaflet.css and give the map container a height |
| Missing Leaflet marker icons | Set L.Icon.Default with the imported marker images |
| LF will be replaced by CRLF | Harmless warning, ignore it |
| npm ci fails | package-lock.json was not committed; commit it from the frontend task |


---

## Part 2 - Original handoff (text extracted, unchanged except for two extraction typos)

Where Part 1 and Part 2 disagree, Part 1 wins.

```text
TSUKUYOMI WATCH  COMPLETE HANDOFF
1
 TSUKUYOMI WATCH
Complete AI-ready hackathon handoff | PS-002 | 3 members | Existing GitHub repository
Objective: create a functioning Japanese-inspired astronomy platform, and make it easy for another coding AI to
continue from the actual repository without guessing or destroying existing work.
1. Product requirements and realistic MVP
Watchtower: Get cloud cover, humidity and visibility from weather sources; compute a documented Night Honor
Score; display curated nearby candidate stargazing spots on a Leaflet map. Weather alone cannot verify
accessibility, safety or light pollution.
Celestial Scroll: Show Moon phase and upcoming meteor showers/eclipses/launches; filter by date/type. ISS
passes and moonrise require location-aware predictions. Label source, local time zone and freshness.
Spirit Lens: Upload an astronomical image, validate it, run a suitable pretrained restoration model, preserve original,
show before/after slider, and detect candidate astronomical sources. Do not claim hallucinated features are real.
Dojo Dashboard: Responsive dark ink-wash / black / red / gold interface with moon motifs, navigation, weather,
events, maps, image comparison and loading/error states.
Demo path: open dashboard → select location → view actual weather and event list → upload astronomy image →
run restoration → compare images → inspect candidate source overlays.
2. Stack and architecture
Frontend: React + Vite + JavaScript, CSS/Tailwind, Leaflet. Backend: Python + FastAPI + Uvicorn. AI: Pillow,
NumPy, OpenCV, PyTorch, optional Astropy/Photutils. Sources: Open-Meteo weather; appropriate event sources
(NASA does not cover everything). Version control: existing GitHub repo. Start without a database unless a feature
needs persistence.
Browser (React)  →  FastAPI HTTP endpoints  →  Weather / Event APIs
                                 -> Image validation → AI inference
Browser displays results, errors, map and image overlays
3. Three-member ownership and sync
Frontend member: React pages, Japanese theme, navigation, weather/event cards, map, upload UI, comparison
slider and object overlays. Use mock responses that exactly match documented API contracts.
Backend member: FastAPI routes, Pydantic schemas, external data adapters, Night Honor Score, CORS,
validation, rate limiting and response/error format. Publish sample JSON before implementation.
AI member: select and license-check model, test representative telescope images, implement
preprocessing/inference/postprocessing, measure runtime, source detection and limitations. Coordinate image
request/response contract with backend member.
Integration owner: designate one of the three (typically team leader) to review PRs, maintain docs and verify full
app. Work in vertical slices: agree contract → frontend mock → backend implementation → integrate → test →
merge.
4. Existing GitHub repo → VS Code / Antigravity
Do NOT create another repo or run git init blindly. Copy the clone URL from the existing GitHub repository. Install Git,
VS Code, Node.js, Python; sign into GitHub using the editor’s supported authentication flow.
git clone <EXISTING_GITHUB_REPO_URL>

TSUKUYOMI WATCH  COMPLETE HANDOFF
2
cd <REPOSITORY_DIRECTORY>
code .
git status
git remote -v
git branch -a
If the repository is already on disk, open that folder in VS Code and run only git status, git remote -v and git branch -a
first. If origin is already correct, do not add it again. If remote and local histories differ, inspect rather than
force-pushing.
VS Code: use Source Control panel for changes, commits, branch switching, sync, and GitHub Pull Requests
extension where appropriate. Antigravity: open the same cloned folder, connect authorized GitHub/editor integration
if available, inspect agent permissions and require approval for terminal/git write actions. Exact menus and agent
capabilities vary by version; do not assume automatic GitHub control.
5. Git collaboration and safe automation
git switch main
git pull --ff-only
git switch -c feature/frontend-shell
# edit and test, then:
git status
git diff
git add <REVIEWED_FILES>
git commit -m "Build frontend shell"
git push -u origin feature/frontend-shell
Open a GitHub pull request from feature branch to main; ask a teammate to review and merge only after checks
pass. Suggested branches: feature/frontend-shell, feature/weather-api, feature/ai-restoration. Avoid all three editing
the same files simultaneously. Enable branch protection / required PR review if supported by the repository.
AI automation boundary: agents may inspect code, edit scoped files, run tests and propose commit/PR messages.
They must NOT silently reset, force-push, delete branches, merge, deploy, alter remotes, or expose secrets. Have AI
summarize changed files and test results before human-approved Git actions. Never paste personal access tokens
into prompts.
6. Repository structure (adapt, do not overwrite existing)
tsukuyomi-watch/
  frontend/src/{components,pages,services}/
  frontend/package.json
  backend/app/{routes,services,schemas,ai}/
  backend/app/main.py
  backend/requirements.txt
  docs/{architecture.md,api-contracts.md}
  README.md
  AGENTS.md
  .gitignore
  .env.example
7. API contracts: define before parallel coding
 GET /api/health → {"status":"ok"}
 GET /api/weather?lat=...&lon=... → location, cloud_cover_percent, humidity_percent, visibility_km (nullable),
night_honor_score, score_method, source, timestamp
 GET /api/locations → list of candidate locations with coordinates, name and data provenance
 GET /api/events?type=...&date=... → event list with type, start_time ISO-8601, timezone, source and description
 POST /api/restore (multipart image) → restored image bytes or documented result URL, model name and warning
 POST /api/detect-objects (image or image ID) → candidate x/y, estimated pixel brightness/size and method

TSUKUYOMI WATCH  COMPLETE HANDOFF
3
Keep field naming and units consistent, document missing-data behavior, use ISO timestamps, and expose
meaningful 4xx/5xx errors. FastAPI automatically provides interactive API docs at /docs.
8. First local development milestone
If repo is empty, initialize React with Vite inside frontend and create a Python virtual environment for backend. If code
exists, inspect package files and reuse it instead.
npm create vite@latest frontend -- --template react
cd frontend && npm install && npm run dev
# Separate terminal, from repository root:
python -m venv .venv
# Windows PowerShell:
.\.venv\Scripts\Activate.ps1
python -m pip install fastapi "uvicorn[standard]"
python -m uvicorn backend.app.main:app --reload
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
app = FastAPI(title="Tsukuyomi Watch")
app.add_middleware(CORSMiddleware,
  allow_origins=["http://localhost:5173"],
  allow_methods=["GET", "POST"],
  allow_headers=["Content-Type"])
@app.get("/api/health")
def health():
    return {"status": "ok"}
Place code in backend/app/main.py; ensure backend/app import paths work (add __init__.py if needed). React
usually runs at localhost:5173, FastAPI at localhost:8000. Make React fetch http://localhost:8000/api/health and
render its status. This is the first integration test.
9. AI image restoration implementation plan
Stage A: validate JPG/PNG or supported FITS format, file size, image dimensions and corrupted input. Stage B:
benchmark simple denoising as baseline and evaluate a pretrained model on real astronomy samples. Stage C: build
a FastAPI inference wrapper with model loaded once and safe output handling. Stage D: compare original/restored
images with a slider and zoom. Stage E: detect candidate bright sources (e.g. Photutils) and overlay measured
positions. Keep results scientific-caution labelled.
A visually sharper image is not necessarily more accurate. Avoid claiming star/galaxy identity, physical size or
calibrated brightness without proper measurements and external context. Record model name, weights license,
hardware needs, runtime and artifacts.
10. Suggested delivery order
 0 — inspect existing repository, protect secrets, agree branch/PR rules and API contracts.
 1 — React and FastAPI run; frontend calls /api/health.
 2 — Japanese-themed shell and mock weather/event/image UI.
 3 — weather API → backend scoring → frontend card/map; clear loading/error handling.
 4 — reliable event list and filters, proper location/date/timezone semantics.
 5 — working image upload, real AI inference and before/after comparison.
 6 — candidate-source overlays; test and explain uncertainty.
 7 — deployment, smoke tests, demo script and fallback if AI hosting is limited.

TSUKUYOMI WATCH  COMPLETE HANDOFF
4
11. Safety, reliability and review checklist
Do not commit .env, credentials, node_modules, .venv, outputs or large model weights. Check provider API rate
limits, attribution and usage terms. Validate uploads, limit memory/time, remove temporary files, handle failed APIs
and loading/empty states. Ensure accessible responsive UI. Test a fresh clone and deployed URLs. Do not call
sample values live data.
PR definition of done: small scoped change, clear description, no secrets, relevant tests/build pass, API contract
unchanged or updated intentionally, error cases considered, reviewer approval.
12. MASTER PROMPT — paste into another AI coding assistant
Copy the following prompt in full. The PDF keeps it as normal wrapped text to prevent clipping:
Act as a senior full-stack developer and AI coding mentor for a beginner three-member hackathon team. Project:
PS-002 Tsukuyomi Watch, a Japanese-themed astronomy app. Members own Frontend (React/Vite UI), Backend
(Python/FastAPI, weather and event APIs), and AI (astronomical image restoration and candidate object detection).
The existing GitHub repository is the source of truth.
FIRST: inspect the current repository tree, README, package manifests, git status, current branch and remotes.
Report findings; do not assume an empty repo or replace working code. Never expose secrets. Ask for missing
repository URL or blocking information only if needed.
GIT POLICY: no git init, force push, hard reset, remote replacement, branch deletion, merge, deployment or silent
commit/push. Require explicit approval for any Git write action. Work in scoped feature branches, show git diff, run
checks and propose a pull request for review.
STACK: React + Vite, Python + FastAPI, Open-Meteo weather, suitable astronomical event APIs, Leaflet/OSM,
Pillow/OpenCV/PyTorch and optional Astropy/Photutils. Adapt to the actual existing repository; avoid unnecessary
dependencies and premature database/auth/microservices.
ARCHITECTURE: frontend communicates with documented FastAPI JSON endpoints. Write docs/api-contracts.md
covering health, weather, locations, events, image restoration and object detection; include sample responses, units,
timestamps, errors and upload format. Coordinate frontend mock data to exact contracts.
BUILD ORDER: (1) React and FastAPI running and frontend calling /api/health, (2) theme/navigation with mock data,
(3) live weather plus transparent Night Honor Score, (4) event list and date/type filters, (5) real pretrained image
restoration with validation, (6) before/after slider and candidate-source overlays, (7) deployment and testing. Keep
changes small, integrate frequently, explain all commands to a beginner.
SCIENTIFIC REQUIREMENTS: preserve originals; do not hallucinate stars/galaxies; label detection candidates and
estimated pixel measurements; do not claim physical sizes or calibrated brightness without supporting data. Clearly
label mock versus live data.
YOUR NEXT RESPONSE: summarize repo state and existing code to preserve; propose one smallest achievable
milestone with files to touch, commands to run, tests and success criteria. Do not make sweeping changes. After
approval, implement only that milestone, show changed files and actual test results, and wait for approval before
committing/pushing.
13. Handoff checklist
Provide the next AI with: GitHub repository URL (not credentials), active branch, OS, editor (VS Code or Antigravity),
current repo structure, deadline, hardware for AI inference, assigned team roles and any API keys only via secure
local environment variables. If unknown, ask the AI to inspect the repository first.

```
