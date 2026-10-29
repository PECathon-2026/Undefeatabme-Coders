import { useEffect, useState } from 'react'
import { apiGet } from '../services/api.js'
import { weatherPath } from '../lib/places.js'

const MAX_LOCATIONS = 12

// Fetches GET /api/weather for each location in parallel (scores always come from the backend).
// Returns { results: [{ location, weather, error }], loading }. Aborts if the list changes.
export function useLocationScores(locations) {
  const [state, setState] = useState({ key: null, results: [] })
  const list = (locations ?? []).slice(0, MAX_LOCATIONS)
  const key = list.map((l) => l.id).join('|')

  useEffect(() => {
    if (!key) return undefined
    const controller = new AbortController()
    Promise.all(
      list.map((location) =>
        apiGet(weatherPath(location), { signal: controller.signal })
          .then((weather) => ({ location, weather, error: null }))
          .catch((err) => ({ location, weather: null, error: err.error })),
      ),
    ).then((results) => {
      if (!controller.signal.aborted) setState({ key, results })
    })
    return () => controller.abort()
    // `list` is derived from `key`, so key is the real dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  const current = key !== '' && state.key === key
  return { results: current ? state.results : [], loading: key !== '' && !current }
}
