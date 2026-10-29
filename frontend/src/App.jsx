import { useEffect, useState } from 'react'
import { apiGet } from './services/api.js'
import './App.css'

function App() {
  const [status, setStatus] = useState('checking...')

  useEffect(() => {
    let cancelled = false
    apiGet('/api/health')
      .then((data) => {
        if (!cancelled) setStatus(data.status)
      })
      .catch(() => {
        if (!cancelled) setStatus(null)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <main className="app">
      <h1>Tsukuyomi Watch</h1>
      {status === null ? (
        <p className="status offline">BACKEND OFFLINE (MOCK)</p>
      ) : (
        <p className="status">Backend status: {status}</p>
      )}
    </main>
  )
}

export default App
