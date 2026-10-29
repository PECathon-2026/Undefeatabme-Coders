import { PanelLeftClose, PanelLeftOpen, Settings } from 'lucide-react'
import MoonPhase from '../astronomy/MoonPhase.jsx'
import { moonPhase } from '../../lib/moon.js'
import { USE_MOCK } from '../../services/api.js'
import { Emblem, Wordmark } from './Logo.jsx'
import './layout.css'

// Small celestial status: today's moon and whether the app is on live or demo data.
function CelestialStatus({ health, collapsed }) {
  const moon = moonPhase()
  const backendOk = health.data?.status === 'ok'
  const mode = USE_MOCK ? 'Demo data (MOCK)' : backendOk ? 'Live API connected' : health.loading ? 'Connecting...' : 'Backend offline'
  const tone = USE_MOCK ? 'demo' : backendOk ? 'live' : health.loading ? 'pending' : 'offline'
  return (
    <div className="celestial-status" title={`${moon.name}, ${Math.round(moon.illumination * 100)}% lit (approximate). ${mode}`}>
      <MoonPhase fraction={moon.fraction} size={collapsed ? 30 : 34} glow={false} label={`${moon.name}, approximately ${Math.round(moon.illumination * 100)}% illuminated`} />
      <div className="status-text">
        <span className="status-moon">{moon.name}</span>
        <span className={`status-mode status-mode-${tone}`}>
          <span className="status-dot" aria-hidden="true" />
          {mode}
        </span>
      </div>
    </div>
  )
}

export default function Navigation({ pages, current, onSelect, collapsed, onToggleCollapsed, onOpenSettings, health }) {
  return (
    <>
      {/* Desktop and laptop: collapsible left sidebar */}
      <aside className={`sidebar ${collapsed ? 'is-collapsed' : ''}`}>
        <button type="button" className="sidebar-brand" onClick={() => onSelect('observatory')} aria-label="Tsukuyomi Watch, go to the Observatory">
          <Emblem size={collapsed ? 40 : 44} />
          {!collapsed && <Wordmark />}
        </button>
        <nav aria-label="Main">
          <ul className="nav-list">
            {pages.map(({ id, label, kanji, icon: Icon }) => (
              <li key={id}>
                <button
                  type="button"
                  className="nav-item"
                  aria-current={id === current ? 'page' : undefined}
                  onClick={() => onSelect(id)}
                  title={collapsed ? label : undefined}
                >
                  <Icon size={20} aria-hidden="true" />
                  <span className={collapsed ? 'visually-hidden' : 'nav-label'}>{label}</span>
                  {!collapsed && (
                    <span className="nav-kanji" lang="ja" aria-hidden="true">
                      {kanji}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </nav>
        <div className="sidebar-foot">
          <CelestialStatus health={health} collapsed={collapsed} />
          <div className="sidebar-controls">
            <button type="button" className="icon-button" onClick={onOpenSettings} aria-label="Settings" title="Settings">
              <Settings size={20} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="icon-button"
              onClick={onToggleCollapsed}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-expanded={!collapsed}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? <PanelLeftOpen size={20} aria-hidden="true" /> : <PanelLeftClose size={20} aria-hidden="true" />}
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile and small tablets: compact top bar plus bottom tab bar */}
      <header className="topbar">
        <button type="button" className="topbar-brand" onClick={() => onSelect('observatory')} aria-label="Tsukuyomi Watch, go to the Observatory">
          <Emblem size={34} />
          <Wordmark compact />
        </button>
        <div className="topbar-actions">
          <CelestialStatus health={health} collapsed />
          <button type="button" className="icon-button" onClick={onOpenSettings} aria-label="Settings">
            <Settings size={20} aria-hidden="true" />
          </button>
        </div>
      </header>
      <nav className="bottom-nav" aria-label="Main (mobile)">
        <ul>
          {pages.map(({ id, shortLabel, icon: Icon }) => (
            <li key={id}>
              <button
                type="button"
                className="bottom-nav-item"
                aria-current={id === current ? 'page' : undefined}
                onClick={() => onSelect(id)}
              >
                <Icon size={20} aria-hidden="true" />
                <span>{shortLabel}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </>
  )
}
