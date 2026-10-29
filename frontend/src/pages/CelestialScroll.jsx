import { useState } from 'react'
import Card from '../components/ui/Card.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import ErrorBox from '../components/ui/ErrorBox.jsx'
import Loading from '../components/ui/Loading.jsx'
import StatusBadge from '../components/ui/StatusBadge.jsx'
import { useApiGet } from '../hooks/useApiGet.js'
import { formatDateTime, todayIn } from '../lib/format.js'
import './scroll.css'

// Event types from docs/api-contracts.md, with a decorative symbol for each.
const EVENT_TYPES = [
  { value: 'all', label: 'All events', symbol: '✦' },
  { value: 'moon_phase', label: 'Moon phase', symbol: '☾' },
  { value: 'meteor_shower', label: 'Meteor shower', symbol: '☄' },
  { value: 'eclipse', label: 'Eclipse', symbol: '◐' },
  { value: 'launch', label: 'Launch', symbol: '⇡' },
]

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

function typeInfo(type) {
  return EVENT_TYPES.find((t) => t.value === type) ?? { label: type, symbol: '✦' }
}

function isUrl(text) {
  return /^https?:\/\//.test(text)
}

function eventsPath(type, date) {
  const params = new URLSearchParams({ type })
  // An empty or partial date is left out, so the backend uses its default (today).
  if (DATE_PATTERN.test(date)) params.set('date', date)
  return `/api/events?${params}`
}

function EventCard({ event }) {
  const info = typeInfo(event.type)
  return (
    <li>
      <Card title={event.title} badge={<StatusBadge dataKind={event.data_kind} />}>
        <p className="event-type">
          <span aria-hidden="true">{info.symbol}</span> {info.label}
        </p>
        <p className="mono">
          <time dateTime={event.start_time}>{formatDateTime(event.start_time, event.timezone)}</time>
          <span className="fine-print"> ({event.timezone})</span>
        </p>
        <p>{event.description}</p>
        <p className="fine-print">
          Source:{' '}
          {isUrl(event.source) ? (
            <a href={event.source} target="_blank" rel="noopener noreferrer">
              {event.source}
            </a>
          ) : (
            event.source
          )}
        </p>
      </Card>
    </li>
  )
}

export default function CelestialScroll() {
  const [type, setType] = useState('all')
  const [date, setDate] = useState(() => todayIn('Asia/Kolkata'))
  // A new filter aborts the previous request and fetches again.
  const { data, error, loading, retry } = useApiGet(eventsPath(type, date))

  return (
    <>

      <form className="filters" onSubmit={(e) => e.preventDefault()} aria-label="Event filters">
        <label className="field">
          <span>Type</span>
          <select value={type} onChange={(e) => setType(e.target.value)}>
            {EVENT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>From date</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
      </form>

      {data?.warnings?.length > 0 && (
        <div className="notice-bar scroll-notice" role="status">
          <ul>
            {data.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      {data?.query && (
        <p className="fine-print results-meta">
          {data.events.length} event{data.events.length === 1 ? '' : 's'} · {data.query.days} days
          from {data.query.date}
        </p>
      )}

      <div aria-live="polite" aria-busy={loading}>
        {loading && <Loading label="Unrolling the scroll..." />}
        {error && <ErrorBox error={error} onRetry={retry} />}
        {data && data.events.length === 0 && <EmptyState message="No events in this range." />}
        {data && data.events.length > 0 && (
          <ul className="event-list">
            {data.events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </ul>
        )}
      </div>
    </>
  )
}
