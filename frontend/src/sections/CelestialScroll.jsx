import Card from '../components/Card.jsx'
import EmptyState from '../components/EmptyState.jsx'
import ErrorBox from '../components/ErrorBox.jsx'
import Loading from '../components/Loading.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import { useApiGet } from '../hooks/useApiGet.js'

function formatTime(iso, timeZone) {
  try {
    return new Intl.DateTimeFormat('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone,
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

export default function CelestialScroll() {
  const { data, error, loading, retry } = useApiGet('/api/events?type=all')
  return (
    <>
      <p className="section-intro">Upcoming moon phases, meteor showers, eclipses and launches.</p>
      <Card title="Upcoming events">
        {loading && <Loading label="Unrolling the scroll..." />}
        {error && <ErrorBox error={error} onRetry={retry} />}
        {data && data.events.length === 0 && <EmptyState message="No events in this range." />}
        {data && data.events.length > 0 && (
          <ul className="item-list">
            {data.events.map((event) => (
              <li key={event.id}>
                <div className="item-title">
                  <strong>{event.title}</strong>
                  <StatusBadge dataKind={event.data_kind} />
                </div>
                <p className="mono">
                  {formatTime(event.start_time, event.timezone)} ({event.timezone})
                </p>
                <p>{event.description}</p>
                <p className="fine-print">Source: {event.source}</p>
              </li>
            ))}
          </ul>
        )}
        {data?.warnings?.map((warning) => (
          <p key={warning} className="disclaimer">
            {warning}
          </p>
        ))}
      </Card>
    </>
  )
}
