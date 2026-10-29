import { createLocalStore } from './localStore.js'

// The latest Spirit Lens results (numbers only, no images), so the Dojo can chart them.
// Kept in this browser only.
const store = createLocalStore('tw-analysis', null)

export const useAnalysis = store.useValue
export const setAnalysis = store.set
