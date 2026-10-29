# API Contracts (source of truth)

- GET /api/health -> {"status":"ok"}
- GET /api/weather?lat=&lon= -> location, cloud_cover_percent, humidity_percent, visibility_km (nullable), night_honor_score, score_method, source, timestamp
- GET /api/locations -> list of {name, lat, lon, provenance}
- GET /api/events?type=&date= -> list of {type, start_time (ISO-8601), timezone, source, description}
- POST /api/restore (multipart image) -> result URL or bytes, model_name, warning
- POST /api/detect-objects -> list of {x, y, brightness_px, size_px, method}