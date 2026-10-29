import { useSyncExternalStore } from 'react'

// A tiny store backed by localStorage. Data stays in this browser; React components re-render on change.
export function createLocalStore(key, fallback) {
  const listeners = new Set()
  let value = load()

  function load() {
    try {
      const stored = JSON.parse(localStorage.getItem(key))
      return stored ?? fallback
    } catch {
      return fallback
    }
  }

  function get() {
    return value
  }

  function set(updater) {
    value = typeof updater === 'function' ? updater(value) : updater
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // Private mode or full storage: keep the in-memory copy.
    }
    listeners.forEach((fn) => fn())
  }

  function subscribe(fn) {
    listeners.add(fn)
    return () => listeners.delete(fn)
  }

  function useValue() {
    return useSyncExternalStore(subscribe, get)
  }

  return { get, set, useValue }
}
