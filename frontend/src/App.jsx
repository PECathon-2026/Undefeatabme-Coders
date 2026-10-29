import { ChartColumn, MoonStar, ScanEye, ScrollText, Telescope } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import Atmosphere from './components/layout/Atmosphere.jsx'
import Navigation from './components/layout/Navigation.jsx'
import SettingsDialog from './components/layout/SettingsDialog.jsx'
import NotificationCenter from './components/notifications/NotificationCenter.jsx'
import { ToastProvider } from './components/ui/Toast.jsx'
import { useApiGet } from './hooks/useApiGet.js'
import { useHashRoute } from './hooks/useHashRoute.js'
import { useReminderScheduler } from './hooks/useReminderScheduler.js'
import { usePersistentState } from './hooks/usePersistentState.js'
import CelestialScroll from './pages/CelestialScroll.jsx'
import Dojo from './pages/Dojo.jsx'
import Observatory from './pages/Observatory.jsx'
import SpiritLens from './pages/SpiritLens.jsx'
import Watchtower from './pages/Watchtower.jsx'
import { USE_MOCK } from './services/api.js'
import './components/layout/layout.css'

const PAGES = [
  {
    id: 'observatory',
    label: 'Observatory',
    shortLabel: 'Home',
    kanji: '月',
    icon: MoonStar,
    Component: Observatory,
  },
  {
    id: 'watchtower',
    label: 'Watchtower',
    shortLabel: 'Watch',
    kanji: '望',
    icon: Telescope,
    intro: 'Find a viewing spot and read tonight’s sky before you travel.',
    Component: Watchtower,
  },
  {
    id: 'scroll',
    label: 'Celestial Scroll',
    shortLabel: 'Scroll',
    kanji: '巻',
    icon: ScrollText,
    intro: 'Moon phases, meteor showers, eclipses and launches in one almanac.',
    Component: CelestialScroll,
  },
  {
    id: 'lens',
    label: 'Spirit Lens',
    shortLabel: 'Lens',
    kanji: '鏡',
    icon: ScanEye,
    intro: 'Enhance a night-sky photo and look for candidate light sources.',
    Component: SpiritLens,
  },
  {
    id: 'dojo',
    label: 'Dojo',
    shortLabel: 'Dojo',
    kanji: '道',
    icon: ChartColumn,
    intro: 'Analyse what Spirit Lens found and review your saved places and events.',
    Component: Dojo,
  },
]
const PAGE_IDS = PAGES.map((p) => p.id)

const DEFAULT_SETTINGS = { reduceMotion: false, atmosphere: true, sidebarCollapsed: false }

function AppShell() {
  const [current, setRoute] = useHashRoute(PAGE_IDS, 'observatory')
  const [settings, setSettings] = usePersistentState('tw-settings', DEFAULT_SETTINGS)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  // Location chosen in Watchtower; other pages use it too. null = default location.
  const [place, setPlace] = useState(null)
  const health = useApiGet('/api/health')
  const mainRef = useRef(null)
  const focusMain = useRef(false)
  const page = PAGES.find((p) => p.id === current)
  const { Component } = page
  useReminderScheduler()

  // Buttons inside a page unmount when it changes, so move focus to the new content.
  function navigate(id) {
    focusMain.current = true
    setRoute(id)
  }

  useEffect(() => {
    document.title = page.id === 'observatory' ? 'Tsukuyomi Watch' : `${page.label} · Tsukuyomi Watch`
    if (focusMain.current) {
      focusMain.current = false
      mainRef.current?.focus()
    }
    window.scrollTo(0, 0)
  }, [page])

  function skipToContent(e) {
    e.preventDefault()
    mainRef.current?.focus()
  }

  return (
    <div className={`app-shell ${settings.sidebarCollapsed ? 'sidebar-collapsed' : ''} ${settings.reduceMotion ? 'reduce-motion' : ''}`}>
      <Atmosphere page={current} enabled={settings.atmosphere} />
      <a className="skip-link" href="#main" onClick={skipToContent}>
        Skip to content
      </a>
      <Navigation
        pages={PAGES}
        current={current}
        onSelect={setRoute}
        collapsed={settings.sidebarCollapsed}
        onToggleCollapsed={() => setSettings((s) => ({ ...s, sidebarCollapsed: !s.sidebarCollapsed }))}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenNotifications={() => setNotificationsOpen(true)}
        health={health}
      />

      <div className="app-column">
        {USE_MOCK && (
          <p className="mock-banner" role="note">
            MOCK MODE: demo data, not live
          </p>
        )}
        <main id="main" className="site-main" tabIndex={-1} ref={mainRef}>
          <div className="page" key={current}>
            {page.intro && (
              <header className="page-header">
                <div>
                  <h1 className="page-title">
                    <span className="page-kanji" lang="ja" aria-hidden="true">
                      {page.kanji}
                    </span>
                    {page.label}
                  </h1>
                  <p className="page-intro">{page.intro}</p>
                </div>
              </header>
            )}
            <Component place={place} onPlaceChange={setPlace} onNavigate={navigate} health={health} />
          </div>
        </main>
        <footer className="site-footer">
          <p>Tsukuyomi Watch · PECathon 2026 · Map data © OpenStreetMap contributors · Weather by Open-Meteo</p>
        </footer>
      </div>

      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onChange={setSettings}
      />
      <NotificationCenter open={notificationsOpen} onClose={() => setNotificationsOpen(false)} />
    </div>
  )
}

// Providers wrap the shell so its hooks (e.g. the reminder scheduler) can show toasts.
function App() {
  return (
    <ToastProvider>
      <AppShell />
    </ToastProvider>
  )
}

export default App
