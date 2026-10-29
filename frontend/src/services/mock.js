// MOCK responses copied from docs/api-contracts.md.
// The only change: every data_kind is "mock", so sample values are never shown as live data.

export const MOCK_DELAY_MS = 400

export const mockHealth = { status: 'ok' }

export const mockWeather = {
  location: { lat: 30.7333, lon: 76.7794, name: null },
  cloud_cover_percent: 23,
  humidity_percent: 55,
  visibility_km: 24.1,
  night_honor_score: 75,
  score_method:
    'v1: 0.6*clear_sky + 0.2*dryness + 0.2*visibility(capped 20 km); weights 0.75/0.25 if visibility is null; ignores moon and light pollution',
  source: 'Open-Meteo',
  data_kind: 'mock',
  timestamp: '2026-10-30T21:00:00+05:30',
  timezone: 'Asia/Kolkata',
  attribution: 'Weather data by Open-Meteo.com',
}

export const mockLocations = {
  locations: [
    {
      id: 'sukhna-lake',
      name: 'Sukhna Lake',
      lat: 30.7421,
      lon: 76.8188,
      provenance:
        'Curated by the team from OpenStreetMap; NOT verified for light pollution, access or safety',
      verified: false,
      data_kind: 'mock',
    },
  ],
  disclaimer: 'Weather cannot verify accessibility, safety or light pollution.',
}

export const mockEvents = {
  events: [
    {
      id: 'sample-leonids',
      type: 'meteor_shower',
      title: 'Leonids (sample entry)',
      start_time: '2026-11-17T00:00:00+05:30',
      timezone: 'Asia/Kolkata',
      source: 'sample',
      description: 'Sample only. Real entries carry a source URL.',
      data_kind: 'mock',
    },
  ],
  query: { type: 'all', date: '2026-11-01', days: 90 },
  warnings: [],
  generated_at: '2026-10-30T21:05:00+05:30',
}

export const mockRestore = {
  restored_image: 'data:image/png;base64,iVBORw0KGgo...',
  width: 1024,
  height: 768,
  model_name: 'opencv-nlmeans-unsharp-baseline',
  model_license: 'Apache-2.0 (OpenCV)',
  runtime_ms: 2140,
  data_kind: 'mock',
  warnings: [
    'Restored image is an algorithmic enhancement, not new data. Features may be artefacts.',
  ],
}

export const mockDetect = {
  image_width: 1024,
  image_height: 768,
  method: 'opencv-threshold-centroid',
  count: 2,
  sources: [
    { id: 1, x: 312.4, y: 190.8, peak_brightness: 0.93, approx_size_px: 4.1 },
    { id: 2, x: 640.0, y: 455.2, peak_brightness: 0.41, approx_size_px: 3.2 },
  ],
  data_kind: 'mock',
  warnings: ['Detections are candidates, not confirmed astronomical objects.'],
}

const GET_ROUTES = {
  '/api/health': mockHealth,
  '/api/weather': mockWeather,
  '/api/locations': mockLocations,
  '/api/events': mockEvents,
}

const POST_ROUTES = {
  '/api/restore': mockRestore,
  '/api/detect-objects': mockDetect,
}

// Returns a fresh copy of the mock for a path (query string ignored), or undefined.
export function findMock(method, path) {
  const pathname = path.split('?')[0]
  const routes = method === 'POST' ? POST_ROUTES : GET_ROUTES
  const data = routes[pathname]
  return data === undefined ? undefined : structuredClone(data)
}
