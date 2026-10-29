import { ArrowRight, Cloud, Droplets, Eye, MapPin, Moon, ScanEye, ScrollText, Sparkles, Telescope } from 'lucide-react'
import { useRef } from 'react'
import MoonPhase from '../components/astronomy/MoonPhase.jsx'
import ScoreGauge from '../components/astronomy/ScoreGauge.jsx'
import Card from '../components/ui/Card.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import ErrorBox from '../components/ui/ErrorBox.jsx'
import MetricCard from '../components/ui/MetricCard.jsx'
import Skeleton from '../components/ui/Skeleton.jsx'
import StatusBadge from '../components/ui/StatusBadge.jsx'
import Unavailable from '../components/ui/Unavailable.jsx'
import { useActivity } from '../lib/activity.js'
import { useApiGet } from '../hooks/useApiGet.js'
import { useLocationScores } from '../hooks/useLocationScores.js'
import { useNow } from '../hooks/useNow.js'
import { formatDateTime } from '../lib/format.js'
import { moonPhase, nextPhaseDate } from '../lib/moon.js'
import { DEFAULT_PLACE, weatherPath } from '../lib/places.js'
import { SCORE_NOTE, scoreBand } from '../lib/score.js'
import { USE_MOCK } from '../services/api.js'
import './observatory.css'

const EVENT_LABELS = {
  moon_phase: 'Moon phase',
  meteor_shower: 'Meteor shower',
  eclipse: 'Eclipse',
  launch: 'Launch',
}

function percent(fraction) {
  return Math.round(fraction * 100)
}

function timeUntil(iso, now) {
  const hours = (new Date(iso).getTime() - now.getTime()) / 3600000
  if (hours <= 0) return 'happening now'
  if (hours < 1) return 'within the hour'
  if (hours < 24) return `in ${Math.round(hours)} hour${Math.round(hours) === 1 ? '' : 's'}`
  const days = Math.round(hours / 24)
  return `in ${days} day${days === 1 ? '' : 's'}`
}

function LiveClock() {
  const now = useNow(1000)
  const date = new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).format(now)
  const time = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(now)
  return (
    <span className="hero-chip">
      <time dateTime={now.toISOString()}>
        {date} · <span className="mono">{time}</span>
      </time>
    </span>
  )
}

function DataStatusChip({ health }) {
  const ok = health.data?.status === 'ok'
  const text = USE_MOCK ? 'Demo data (MOCK)' : ok ? 'Live data connected' : health.loading ? 'Connecting to backend...' : 'Live data unavailable'
  const tone = USE_MOCK ? 'demo' : ok ? 'live' : health.loading ? 'pending' : 'offline'
  return (
    <span className={`hero-chip status-mode-${tone}`} role="status">
      <span className="status-dot" aria-hidden="true" />
      {text}
    </span>
  )
}

// Petals drift across the hero only; hidden when motion is reduced.
const PETALS = [
  { left: '8%', delay: '0s', duration: '17s' },
  { left: '26%', delay: '6s', duration: '21s' },
  { left: '47%', delay: '11s', duration: '19s' },
  { left: '63%', delay: '3s', duration: '23s' },
  { left: '82%', delay: '9s', duration: '18s' },
]

function Hero({ moon, health, onEnter, onExplore }) {
  return (
    <section className="hero" aria-labelledby="hero-title">
      <svg className="hero-scene" viewBox="0 0 1200 420" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
        <defs>
          <linearGradient id="hero-far" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#202741" />
            <stop offset="100%" stopColor="#0c0f1b" />
          </linearGradient>
          <linearGradient id="hero-near" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0f111c" />
            <stop offset="100%" stopColor="#06070b" />
          </linearGradient>
          <linearGradient id="hero-mist" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#c8ccd8" stopOpacity="0" />
            <stop offset="60%" stopColor="#c8ccd8" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#c8ccd8" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path fill="url(#hero-far)" d="M0 300 L110 250 L210 280 L330 200 L430 262 L540 228 L640 270 L760 190 L860 250 L980 214 L1090 262 L1200 236 L1200 420 L0 420 Z" />
        <g className="hero-torii" transform="translate(742 152)">
          <path d="M0 14 Q38 3 76 14 L76 19 Q38 9 0 19 Z" />
          <rect x="8" y="27" width="60" height="4" />
          <rect x="14" y="17" width="5" height="44" />
          <rect x="57" y="17" width="5" height="44" />
        </g>
        <rect className="hero-mist" x="0" y="230" width="1200" height="110" fill="url(#hero-mist)" />
        <path fill="url(#hero-near)" d="M0 350 L150 300 L290 340 L420 296 L560 352 L700 318 L860 360 L1010 312 L1200 346 L1200 420 L0 420 Z" />
      </svg>
      <div className="petals" aria-hidden="true">
        {PETALS.map((p) => (
          <span key={p.left} className="petal" style={{ left: p.left, animationDelay: p.delay, animationDuration: p.duration }} />
        ))}
      </div>

      <div className="hero-content">
        <p className="hero-eyebrow" lang="ja">
          月読 · Tsukuyomi
        </p>
        <h1 id="hero-title" className="hero-title">
          Tsukuyomi Watch
        </h1>
        <p className="hero-tagline">Read the heavens. Follow the moon. Find your moment.</p>
        <p className="hero-text">
          Your personal celestial guide for discovering dark skies, tracking cosmic events, and revealing the universe
          hidden within astronomical images.
        </p>
        <div className="hero-actions">
          <button type="button" className="button button-primary" onClick={onEnter}>
            Enter the Observatory
            <ArrowRight size={18} aria-hidden="true" />
          </button>
          <button type="button" className="button" onClick={onExplore}>
            <Telescope size={18} aria-hidden="true" />
            Explore Tonight’s Sky
          </button>
        </div>
        <div className="hero-status">
          <DataStatusChip health={health} />
          <LiveClock />
          <span className="hero-chip">
            <Moon size={14} aria-hidden="true" />
            {moon.name} · {percent(moon.illumination)}% lit
          </span>
        </div>
      </div>

      <div className="hero-moon">
        <MoonPhase fraction={moon.fraction} size={260} label={`Tonight’s moon: ${moon.name}, about ${percent(moon.illumination)}% illuminated (approximate)`} />
      </div>
    </section>
  )
}

function MoonCard({ moon }) {
  const nextFull = nextPhaseDate(0.5)
  const nextNew = nextPhaseDate(0)
  const fmt = (d) => new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' }).format(d)
  return (
    <Card headingLevel={3} title="Moon phase" icon={Moon} badge={<StatusBadge dataKind="computed" />} className="moon-card">
      <div className="moon-row">
        <MoonPhase fraction={moon.fraction} size={96} glow={false} label={`${moon.name}, about ${percent(moon.illumination)}% illuminated`} />
        <div>
          <p className="moon-name">
            {moon.name}
            {moon.kanji && (
              <span lang="ja" className="moon-kanji">
                {moon.kanji}
              </span>
            )}
          </p>
          <p className="moon-illum">
            <span className="mono">{percent(moon.illumination)}%</span> illuminated
          </p>
          <p className="fine-print">Age {moon.age.toFixed(1)} days · {moon.waxing ? 'waxing' : 'waning'}</p>
        </div>
      </div>
      <dl className="facts">
        <dt>Next full moon</dt>
        <dd>≈ {fmt(nextFull)}</dd>
        <dt>Next new moon</dt>
        <dd>≈ {fmt(nextNew)}</dd>
      </dl>
      <Unavailable what="Moonrise and moonset" />
      <p className="fine-print">Approximate (mean lunar cycle, about ±1 day), computed in your browser.</p>
    </Card>
  )
}

function ScoreCard({ place, weather, onNavigate }) {
  const { data, error, loading, retry } = weather
  const band = scoreBand(data?.night_honor_score)
  return (
    <Card headingLevel={3} title="Night Honor Score" icon={Sparkles} badge={data && <StatusBadge dataKind={data.data_kind} />} className="score-card">
      <p className="place-name">
        <MapPin size={16} aria-hidden="true" />
        {place.name}
      </p>
      {loading && <Skeleton lines={3} label="Loading tonight’s score" />}
      {error && <ErrorBox error={error} onRetry={retry} />}
      {data && (
        <>
          <ScoreGauge score={data.night_honor_score} size={190} />
          <p className="fine-print score-note">
            {band ? `${band.label} conditions. ` : ''}
            {SCORE_NOTE}
          </p>
        </>
      )}
      <button type="button" className="button button-small" onClick={() => onNavigate('watchtower')}>
        Choose another location
      </button>
    </Card>
  )
}

function ConditionsCard({ weather }) {
  const { data, error, loading, retry } = weather
  const kind = data?.data_kind
  return (
    <Card headingLevel={3} title="Sky conditions" icon={Cloud} badge={kind && <StatusBadge dataKind={kind} />} className="conditions-card">
      {error ? (
        <ErrorBox error={error} onRetry={retry} />
      ) : (
        <div className="metric-stack">
          <MetricCard layout="row" label="Cloud cover" icon={Cloud} value={data?.cloud_cover_percent} unit="%" loading={loading} />
          <MetricCard layout="row" label="Visibility" icon={Eye} value={data?.visibility_km} unit="km" loading={loading} />
          <MetricCard layout="row" label="Humidity" icon={Droplets} value={data?.humidity_percent} unit="%" loading={loading} />
        </div>
      )}
      {data && (
        <p className="fine-print">
          As of {formatDateTime(data.timestamp, data.timezone)} · {data.attribution}
        </p>
      )}
    </Card>
  )
}

function NextEventCard({ onNavigate }) {
  const now = useNow(60000)
  const { data, error, loading, retry } = useApiGet('/api/events?type=all')
  // "Major" = anything other than a routine moon phase; fall back to the first event.
  const event = data?.events.find((e) => e.type !== 'moon_phase') ?? data?.events[0]
  return (
    <Card headingLevel={3} title="Next major event" icon={ScrollText} badge={event && <StatusBadge dataKind={event.data_kind} />}>
      {loading && <Skeleton lines={3} label="Loading events" />}
      {error && <ErrorBox error={error} onRetry={retry} />}
      {data && !event && <EmptyState message="No events in the next 90 days." />}
      {event && (
        <div className="next-event">
          <p className="next-event-type">{EVENT_LABELS[event.type] ?? event.type}</p>
          <p className="next-event-title">{event.title}</p>
          <p className="mono">
            <time dateTime={event.start_time}>{formatDateTime(event.start_time, event.timezone)}</time>
          </p>
          <p className="next-event-countdown">{timeUntil(event.start_time, now)}</p>
        </div>
      )}
      <button type="button" className="button button-small" onClick={() => onNavigate('scroll')}>
        Open Celestial Scroll
      </button>
    </Card>
  )
}

function BestSpotCard({ onNavigate, onPlaceChange }) {
  const locations = useApiGet('/api/locations')
  const scores = useLocationScores(locations.data?.locations)
  const scored = scores.results.filter((r) => r.weather?.night_honor_score !== null && r.weather?.night_honor_score !== undefined)
  const best = scored.reduce((top, r) => (!top || r.weather.night_honor_score > top.weather.night_honor_score ? r : top), null)
  const loading = locations.loading || scores.loading

  function viewBest() {
    onPlaceChange({ id: best.location.id, lat: best.location.lat, lon: best.location.lon, name: best.location.name })
    onNavigate('watchtower')
  }

  return (
    <Card headingLevel={3} title="Best nearby spot" icon={MapPin} badge={best && <StatusBadge dataKind={best.weather.data_kind} />}>
      {loading && <Skeleton lines={2} label="Scoring viewing spots" />}
      {locations.error && <ErrorBox error={locations.error} onRetry={locations.retry} />}
      {!loading && locations.data && !best && <EmptyState message="No scored locations available right now." />}
      {best && (
        <>
          <p className="best-name">{best.location.name}</p>
          <p>
            Score <span className="mono best-score">{best.weather.night_honor_score}</span>/100 ·{' '}
            {scoreBand(best.weather.night_honor_score)?.label}
          </p>
          <p className="fine-print">
            Best of {scored.length} curated spot{scored.length === 1 ? '' : 's'} by tonight’s score.{' '}
            {best.location.verified ? '' : 'Not verified for access, safety or light pollution.'}
          </p>
          <button type="button" className="button button-small" onClick={viewBest}>
            View in Watchtower
          </button>
        </>
      )}
    </Card>
  )
}

function ActivityCard({ onNavigate }) {
  const activity = useActivity()
  const recent = activity.slice(0, 3)
  return (
    <Card headingLevel={3} title="Recent Spirit Lens activity" icon={ScanEye}>
      {recent.length === 0 ? (
        <EmptyState message="No images processed in this browser yet." />
      ) : (
        <ul className="item-list">
          {recent.map((a) => (
            <li key={a.at}>
              <div className="item-title">
                <strong className="activity-file">{a.fileName}</strong>
                <StatusBadge dataKind={a.dataKind} />
              </div>
              <p className="fine-print">
                {a.action === 'detect' ? `${a.count} candidate source${a.count === 1 ? '' : 's'} found` : 'Restored'} ·{' '}
                {new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(a.at))}
              </p>
            </li>
          ))}
        </ul>
      )}
      <button type="button" className="button button-small" onClick={() => onNavigate('lens')}>
        Open Spirit Lens
      </button>
    </Card>
  )
}

export default function Observatory({ place, onPlaceChange, onNavigate, health }) {
  const overviewRef = useRef(null)
  const moon = moonPhase()
  const current = place ?? DEFAULT_PLACE
  const weather = useApiGet(weatherPath(current))

  function enterObservatory() {
    overviewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    overviewRef.current?.focus({ preventScroll: true })
  }

  return (
    <>
      <Hero moon={moon} health={health} onEnter={enterObservatory} onExplore={() => onNavigate('watchtower')} />

      <section className="overview" aria-labelledby="overview-title" ref={overviewRef} tabIndex={-1}>
        <h2 id="overview-title" className="overview-title">
          Tonight’s observatory
        </h2>
        <div className="overview-grid">
          <ScoreCard place={current} weather={weather} onNavigate={onNavigate} />
          <MoonCard moon={moon} />
          <ConditionsCard weather={weather} />
          <NextEventCard onNavigate={onNavigate} />
          <BestSpotCard onNavigate={onNavigate} onPlaceChange={onPlaceChange} />
          <ActivityCard onNavigate={onNavigate} />
        </div>
      </section>
    </>
  )
}
