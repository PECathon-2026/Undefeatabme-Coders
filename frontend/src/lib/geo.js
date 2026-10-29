const EARTH_RADIUS_KM = 6371

// Great-circle distance between two {lat, lon} points, in km.
export function distanceKm(a, b) {
  const toRad = (d) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLon = toRad(b.lon - a.lon)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h))
}

export function formatKm(km) {
  return km < 10 ? `${km.toFixed(1)} km` : `${Math.round(km)} km`
}
