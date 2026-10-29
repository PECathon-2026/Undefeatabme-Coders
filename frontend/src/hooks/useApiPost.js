import { useCallback, useEffect, useRef, useState } from 'react'
import { apiPostFile } from '../services/api.js'

const IDLE = { data: null, error: null, loading: false, startedAt: null, uploaded: 0 }

// Uploads a file with apiPostFile. Tracks loading, error, data, upload progress (0-1) and elapsed time.
// A new run() or reset() aborts the request still in flight. run() resolves to the data, or null.
export function useApiPost() {
  const [state, setState] = useState(IDLE)
  const [now, setNow] = useState(0)
  const controllerRef = useRef(null)

  useEffect(() => {
    if (!state.loading) return undefined
    const timer = setInterval(() => setNow(Date.now()), 100)
    return () => clearInterval(timer)
  }, [state.loading])

  useEffect(() => () => controllerRef.current?.abort(), [])

  const run = useCallback(async (path, file) => {
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    const startedAt = Date.now()
    setNow(startedAt)
    setState({ data: null, error: null, loading: true, startedAt, uploaded: 0 })
    const onUploadProgress = (uploaded) => {
      if (!controller.signal.aborted) setState((s) => ({ ...s, uploaded }))
    }
    try {
      const data = await apiPostFile(path, file, { signal: controller.signal, onUploadProgress })
      setState({ data, error: null, loading: false, startedAt, uploaded: 1 })
      return data
    } catch (err) {
      if (!controller.signal.aborted) setState({ data: null, error: err.error, loading: false, startedAt, uploaded: 0 })
      return null
    }
  }, [])

  const reset = useCallback(() => {
    controllerRef.current?.abort()
    setState(IDLE)
  }, [])

  return { ...state, elapsedMs: state.loading ? now - state.startedAt : 0, run, reset }
}
