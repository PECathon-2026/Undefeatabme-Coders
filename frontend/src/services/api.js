// API client for the Tsukuyomi Watch backend (see docs/api-contracts.md).
// Every failure is thrown as {error: {code, message}}, matching the backend error shape.

const BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '')

function apiError(code, message) {
  return { error: { code, message } }
}

async function request(path, options) {
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
