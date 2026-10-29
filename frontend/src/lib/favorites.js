import { useSyncExternalStore } from 'react'

// Favourite location ids, kept in this browser only (localStorage).
const KEY = 'tw-favorites'
const listeners = new Set()
let cache = load()

function load() {
  try {
    const ids = JSON.parse(localStorage.getItem(KEY))
    return Array.isArray(ids) ? ids : []
  } catch {
    return []
  }
}

// Returns true if the id is now a favourite.
export function toggleFavorite(id) {
  const added = !cache.includes(id)
  cache = added ? [...cache, id] : cache.filter((x) => x !== id)
  try {
    localStorage.setItem(KEY, JSON.stringify(cache))
  } catch {
    // Storage unavailable: keep the in-memory copy.
  }
  listeners.forEach((fn) => fn())
  return added
}

function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function useFavorites() {
  return useSyncExternalStore(subscribe, () => cache)
}
