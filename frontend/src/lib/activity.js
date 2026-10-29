import { useSyncExternalStore } from 'react'

// Recent Spirit Lens runs, kept in this browser only (localStorage). Never sent anywhere.
const KEY = 'tw-activity'
const MAX_ITEMS = 10
const listeners = new Set()
let cache = load()

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) ?? []
  } catch {
    return []
  }
}

export function recordActivity(entry) {
  cache = [{ ...entry, at: new Date().toISOString() }, ...cache].slice(0, MAX_ITEMS)
  try {
    localStorage.setItem(KEY, JSON.stringify(cache))
  } catch {
    // Storage unavailable: keep the in-memory copy.
  }
  listeners.forEach((fn) => fn())
}

function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function useActivity() {
  return useSyncExternalStore(subscribe, () => cache)
}
