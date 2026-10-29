import Card from '../components/Card.jsx'
import EmptyState from '../components/EmptyState.jsx'
import ErrorBox from '../components/ErrorBox.jsx'
import Loading from '../components/Loading.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import WeatherCard from '../components/WeatherCard.jsx'
import { useApiGet } from '../hooks/useApiGet.js'
import { formatDateTime } from '../lib/format.js'
import { DEFAULT_PLACE, weatherPath } from '../lib/places.js'
import { USE_MOCK } from '../services/api.js'

const EVENTS_SHOWN = 3

function HealthCard() {
  const { data, error, loading, retry } = useApiGet('/api/health')
  // /api/health has no data_kind, so mark it by the app's mode.
  const badge = <StatusBadge dataKind={USE_MOCK ? 'mock' : 'live'} />
  return (
    <Card title="Backend" badge={!loading && !error ? badge : null}>
      {loading && <Loading label="Checking backend..." />}
      {error && <ErrorBox error={error} onRetry={retry} />}
      {data && (
        <p className="health">
          <span className={`health-dot ${data.status === 'ok' ? 'health-ok' : ''}`} aria-hidden="true" />
          Backend status: {data.status}
        </p>
      )}
    </Card>
  )
}

function NextEventsCard({ onNavigate }) {
  // The backend returns events sorted by start_time from today; show the first few as-is.
  const { data, error, loading, retry } = useApiGet('/api/events?type=all')
  const events = data?.events.slice(0, EVENTS_SHOWN) ?? []
  return (
    <Card title={`Next ${EVENTS_SHOWN} events`}>
      {loading && <Loading label="Unrolling the scroll..." />}
      {error && <ErrorBox error={error} onRetry={retry} />}
      {data && events.length === 0 && <EmptyState message="No upcoming events." />}
      {events.length > 0 && (
        <ul className="item-list">
          {events.map((event) => (
            <li key={event.id}>
              <div className="item-title">
                <strong>{event.title}</strong>
                <StatusBadge dataKind={event.data_kind} />
              </div>
              <p className="mono">
                <time dateTime={event.start_time}>{formatDateTime(event.start_time, event.timezone)}</time>
              </p>
            </li>
          ))}
        </ul>
      )}
      {data?.warnings?.map((warning) => (
        <p key={warning} className="disclaimer">
          {warning}
        </p>
      ))}
      <button type="button" className="button" onClick={() => onNavigate('scroll')}>
        See all events
      </button>
    </Card>
  )
}

function SpiritLensCard({ onNavigate }) {
  return (
    <Card title="Spirit Lens">
      <p>Enhance a night-sky photo and look for candidate light sources.</p>
      <button type="button" className="button button-primary" onClick={() => onNavigate('lens')}>
        Open Spirit Lens
      </button>
    </Card>
  )
}

export default function DojoDashboard({ place, onNavigate }) {
  const current = place ?? DEFAULT_PLACE
  const weather = useApiGet(weatherPath(current))
  return (
    <>
      <p className="section-intro">Tonight at a glance.</p>
      <div className="dashboard-grid">
        <WeatherCard title="Night Honor Score" placeName={current.name} weather={weather}>
          <button type="button" className="button" onClick={() => onNavigate('watchtower')}>
            Choose another location
          </button>
        </WeatherCard>
        <NextEventsCard onNavigate={onNavigate} />
        <HealthCard />
        <SpiritLensCard onNavigate={onNavigate} />
      </div>
    </>
  )
}
