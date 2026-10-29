import { createLocalStore } from './localStore.js'

// Recent Spirit Lens runs, kept in this browser only. Never sent anywhere.
const MAX_ITEMS = 10
const store = createLocalStore('tw-activity', [])

export function recordActivity(entry) {
  store.set((list) => [{ ...entry, at: new Date().toISOString() }, ...list].slice(0, MAX_ITEMS))
}

export const useActivity = store.useValue
