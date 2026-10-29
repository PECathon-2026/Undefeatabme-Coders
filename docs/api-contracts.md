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
