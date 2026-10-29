import Card from './Card.jsx'
import EmptyState from './EmptyState.jsx'
import ErrorBox from './ErrorBox.jsx'
import Loading from './Loading.jsx'
import StatusBadge from './StatusBadge.jsx'

const NOT_AVAILABLE = 'not available'

function formatPercent(value) {
  return value === null || value === undefined ? NOT_AVAILABLE : `${value}%`
}

function formatTimestamp(iso, timeZone) {
  try {
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZone,
      timeZoneName: 'short',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

// Weather and Night Honor Score for one place, from GET /api/weather.
export default function WeatherCard({ title = 'Night Honor Score', placeName, weather, emptyMessage }) {
  const { data, error, loading, retry } = weather
  return (
    <Card title={title} badge={data && <StatusBadge dataKind={data.data_kind} />}>
      {placeName && <p className="place-name">{placeName}</p>}
      {loading && <Loading label="Reading the sky..." />}
      {error && <ErrorBox error={error} onRetry={retry} />}
      {!loading && !error && !data && <EmptyState message={emptyMessage} />}
      {data && (
        <>
          <p className="score" aria-label={`Night Honor Score ${data.night_honor_score ?? NOT_AVAILABLE} out of 100`}>
            {data.night_honor_score ?? '-'}
            <span className="score-max">/100</span>
          </p>
          <dl className="facts">
            <dt>Cloud cover</dt>
            <dd>{formatPercent(data.cloud_cover_percent)}</dd>
            <dt>Humidity</dt>
            <dd>{formatPercent(data.humidity_percent)}</dd>
            <dt>Visibility</dt>
            <dd>{data.visibility_km === null ? NOT_AVAILABLE : `${data.visibility_km} km`}</dd>
            <dt>As of</dt>
            <dd>{formatTimestamp(data.timestamp, data.timezone)}</dd>
          </dl>
          <details className="score-details">
            <summary>How is this scored?</summary>
            <p className="fine-print">{data.score_method}</p>
          </details>
          <p className="fine-print">{data.attribution}</p>
        </>
      )}
    </Card>
  )
}
