import { useCallback, useEffect, useState } from 'react'
import { apiGet } from '../services/api.js'

// Fetches a GET endpoint and tracks loading / error / data. retry() fetches again.
// Pass path = null to fetch nothing. A new path aborts the previous (stale) request.
export function useApiGet(path) {
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState({ key: null, data: null, error: null })
  const key = path === null ? null : `${path}#${attempt}`

  useEffect(() => {
    if (key === null) return undefined
    const controller = new AbortController()
    apiGet(path, { signal: controller.signal })
      .then((data) => setResult({ key, data, error: null }))
      .catch((err) => {
        if (!controller.signal.aborted) setResult({ key, data: null, error: err.error })
      })
    return () => controller.abort()
  }, [path, key])

  const retry = useCallback(() => setAttempt((n) => n + 1), [])

  // Loading until a result arrives for the current request.
  const current = key !== null && result.key === key
  return {
    data: current ? result.data : null,
    error: current ? result.error : null,
    loading: key !== null && !current,
    retry,
  }
}
