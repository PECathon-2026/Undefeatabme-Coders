// API client for the Tsukuyomi Watch backend (see docs/api-contracts.md).
// Every failure is thrown as {error: {code, message}}, matching the backend error shape.
// When VITE_USE_MOCK is "true", MOCK data from ./mock.js is returned instead of calling the API.
// Pass {signal} from an AbortController to cancel a request; it then throws code "aborted".
// apiPostFile also accepts onUploadProgress(fraction 0-1); fetch cannot report upload progress, so XHR is used then.

import { findMock, MOCK_DELAY_MS } from './mock.js'

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '')

export const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

function apiError(code, message) {
  return { error: { code, message } }
}

const abortedError = () => apiError('aborted', 'Request was cancelled.')

async function mockRequest(method, path, signal, file) {
  await new Promise((resolve) => setTimeout(resolve, MOCK_DELAY_MS))
  if (signal?.aborted) throw abortedError()
  let data
  try {
    data = await findMock(method, path, file)
  } catch {
    throw apiError('invalid_image', 'File is not a valid JPEG or PNG image.')
  }
  if (signal?.aborted) throw abortedError()
  if (data === undefined) {
    throw apiError('not_found', `No MOCK data for ${method} ${path}.`)
  }
  return data
}

async function request(path, options) {
  if (USE_MOCK) return mockRequest(options.method, path, options.signal, options.body?.get?.('file'))

  let response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, options)
  } catch {
    if (options.signal?.aborted) throw abortedError()
    throw apiError('network_error', 'Cannot reach the server. Is the backend running?')
  }

  let body = null
  try {
    body = await response.json()
  } catch {
    // Non-JSON body; handled below.
  }
  if (options.signal?.aborted) throw abortedError()

  if (!response.ok) {
    if (body?.error?.code) throw body
    throw apiError('http_error', `Request failed with status ${response.status}.`)
  }
  if (body === null) {
    throw apiError('invalid_response', 'Server returned a response that is not valid JSON.')
  }
  return body
}

export function apiGet(path, { signal } = {}) {
  return request(path, { method: 'GET', signal })
}

// Upload with progress events. Same error shape and abort behaviour as request().
function uploadWithProgress(path, form, signal, onUploadProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${API_BASE_URL}${path}`)
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onUploadProgress(e.loaded / e.total)
    }
    xhr.onload = () => {
      let body = null
      try {
        body = JSON.parse(xhr.responseText)
      } catch {
        // Non-JSON body; handled below.
      }
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(body?.error?.code ? body : apiError('http_error', `Request failed with status ${xhr.status}.`))
      } else if (body === null) {
        reject(apiError('invalid_response', 'Server returned a response that is not valid JSON.'))
      } else {
        resolve(body)
      }
    }
    xhr.onerror = () => reject(apiError('network_error', 'Cannot reach the server. Is the backend running?'))
    xhr.onabort = () => reject(abortedError())
    if (signal) {
      if (signal.aborted) return reject(abortedError())
      signal.addEventListener('abort', () => xhr.abort(), { once: true })
    }
    xhr.send(form)
  })
}

export function apiPostFile(path, file, { signal, onUploadProgress } = {}) {
  const form = new FormData()
  form.append('file', file)
  if (onUploadProgress && !USE_MOCK) return uploadWithProgress(path, form, signal, onUploadProgress)
  if (onUploadProgress) onUploadProgress(1)
  return request(path, { method: 'POST', body: form, signal })
}
