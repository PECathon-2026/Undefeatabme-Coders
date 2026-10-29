import { createLocalStore } from './localStore.js'

// Favourite location ids, kept in this browser only.
const store = createLocalStore('tw-favorites', [])

// Returns true if the id is now a favourite.
export function toggleFavorite(id) {
  const added = !store.get().includes(id)
  store.set((ids) => (added ? [...ids, id] : ids.filter((x) => x !== id)))
  return added
}

export const useFavorites = store.useValue
