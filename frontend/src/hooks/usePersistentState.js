import { useEffect, useState } from 'react'

// useState that is saved in localStorage under `key`. Falls back to `initial` if storage is unavailable.
export function usePersistentState(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const stored = localStorage.getItem(key)
      return stored === null ? initial : { ...initial, ...JSON.parse(stored) }
    } catch {
      return initial
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // Private mode or full storage: keep working in memory.
    }
  }, [key, value])

  return [value, setValue]
}
