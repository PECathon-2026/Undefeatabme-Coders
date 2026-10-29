// Chandigarh, the default location in the contract examples.
export const DEFAULT_PLACE = { lat: 30.7333, lon: 76.7794, name: 'Chandigarh (default)' }

export function weatherPath(place) {
  if (!place) return null
  return `/api/weather?lat=${place.lat.toFixed(4)}&lon=${place.lon.toFixed(4)}`
}

export function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}
