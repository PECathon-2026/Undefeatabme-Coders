// API client for the Tsukuyomi Watch backend (see docs/api-contracts.md).
// Every failure is thrown as {error: {code, message}}, matching the backend error shape.
// When VITE_USE_MOCK is "true", MOCK data from ./mock.js is returned instead of calling the API.

import { findMock, MOCK_DELAY_MS } from './mock.js'

const BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '')

export const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

function apiError(code, message) {
  return { error: { code, message } }
}

async function mockRequest(method, path) {
  await new Promise((resolve) => setTimeout(resolve, MOCK_DELAY_MS))
  const data = findMock(method, path)
  if (data === undefined) {
    throw apiError('not_found', `No MOCK data for ${method} ${path}.`)
  }
  return data
}

async function request(path, options) {
  if (USE_MOCK) return mockRequest(options.method, path)

  let response
  try {
    response = await fetch(`${BASE_URL}${path}`, options)
  } catch {
    throw apiError('network_error', 'Cannot reach the server. Is the backend running?')
  }

  let body = null
  try {
    body = await response.json()
  } catch {
    // Non-JSON body; handled below.
  }

  if (!response.ok) {
    if (body?.error?.code) throw body
    throw apiError('http_error', `Request failed with status ${response.status}.`)
  }
  if (body === null) {
    throw apiError('invalid_response', 'Server returned a response that is not valid JSON.')
  }
  return body
}

export function apiGet(path) {
  return request(path, { method: 'GET' })
}

export function apiPostFile(path, file) {
  const form = new FormData()
  form.append('file', file)
  return request(path, { method: 'POST', body: form })
}
