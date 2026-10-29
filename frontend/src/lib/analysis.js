import { createLocalStore } from './localStore.js'

// The latest Spirit Lens results (numbers only, no images), so the Dojo can chart them.
// Kept in this browser only.
const store = createLocalStore('tw-analysis', null)

export const useAnalysis = store.useValue
export const setAnalysis = store.set

// This session's images for the Dojo comparison. Memory only: never written to storage.
let sessionImages = null

export function rememberImages(images) {
  sessionImages = images
}

export function getSessionImages() {
  return sessionImages
}
