import { useCallback, useEffect, useState } from 'react'
import { apiGet } from '../services/api.js'

// Fetches a GET endpoint and tracks loading / error / data. retry() fetches again.
export function useApiGet(path) {
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState({ key: null, data: null, error: null })
  const key = `${path}#${attempt}`

  useEffect(() => {
    let cancelled = false
    apiGet(path)
      .then((data) => {
        if (!cancelled) setResult({ key, data, error: null })
      })
      .catch((err) => {
        if (!cancelled) setResult({ key, data: null, error: err.error })
      })
    return () => {
      cancelled = true
    }
  }, [path, key])

  const retry = useCallback(() => setAttempt((n) => n + 1), [])

  // Loading until a result arrives for the current request.
  const loading = result.key !== key
  return {
    data: loading ? null : result.data,
    error: loading ? null : result.error,
    loading,
    retry,
  }
}
