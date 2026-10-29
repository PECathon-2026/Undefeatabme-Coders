import { useEffect, useRef, useState } from 'react'
import MoonMotif from './components/MoonMotif.jsx'
import NavBar from './components/NavBar.jsx'
import CelestialScroll from './sections/CelestialScroll.jsx'
import DojoDashboard from './sections/DojoDashboard.jsx'
import SpiritLens from './sections/SpiritLens.jsx'
import Watchtower from './sections/Watchtower.jsx'
import { USE_MOCK } from './services/api.js'
import './App.css'

const SECTIONS = [
  { id: 'dashboard', label: 'Dojo Dashboard', kanji: '道', Component: DojoDashboard },
  { id: 'watchtower', label: 'Watchtower', kanji: '望', Component: Watchtower },
  { id: 'scroll', label: 'Celestial Scroll', kanji: '巻', Component: CelestialScroll },
  { id: 'lens', label: 'Spirit Lens', kanji: '鏡', Component: SpiritLens },
]

function App() {
  const [current, setCurrent] = useState(SECTIONS[0].id)
  // Location chosen in Watchtower; the Dashboard uses it too. null = default location.
  const [place, setPlace] = useState(null)
  const mainRef = useRef(null)
  const focusMain = useRef(false)
  const section = SECTIONS.find((s) => s.id === current)
  const { Component } = section

  // Shortcut buttons inside a section unmount when it changes, so move focus to the new content.
  function navigate(id) {
    focusMain.current = true
    setCurrent(id)
  }

  useEffect(() => {
    if (!focusMain.current) return
    focusMain.current = false
    mainRef.current?.focus()
  }, [current])

  return (
    <div className="app">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="site-header">
        <div className="brand">
          <MoonMotif />
          <div>
            <p className="brand-name">Tsukuyomi Watch</p>
            <p className="brand-sub">月読 · night sky watch</p>
          </div>
        </div>
        {USE_MOCK && (
          <p className="mock-banner" role="note">
            MOCK MODE: sample data, not live
          </p>
        )}
        <NavBar sections={SECTIONS} current={current} onSelect={setCurrent} />
      </header>

      <main id="main" className="site-main" tabIndex={-1} ref={mainRef}>
        <h2 className="section-title">
          <span aria-hidden="true">{section.kanji}</span> {section.label}
        </h2>
        <Component place={place} onPlaceChange={setPlace} onNavigate={navigate} />
      </main>

      <footer className="site-footer">
        <p>Tsukuyomi Watch · PECathon 2026</p>
      </footer>
    </div>
  )
}

export default App
