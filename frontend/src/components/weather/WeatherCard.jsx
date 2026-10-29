import { Sparkles } from 'lucide-react'
import ScoreGauge from '../astronomy/ScoreGauge.jsx'
import Card from '../ui/Card.jsx'
import EmptyState from '../ui/EmptyState.jsx'
import ErrorBox from '../ui/ErrorBox.jsx'
import Skeleton from '../ui/Skeleton.jsx'
import StatusBadge from '../ui/StatusBadge.jsx'
import { formatDateTime } from '../../lib/format.js'
import { SCORE_NOTE } from '../../lib/score.js'
import './weather.css'

const NOT_AVAILABLE = 'not available'

function formatPercent(value) {
  return value === null || value === undefined ? NOT_AVAILABLE : `${value}%`
}

// Weather and Night Honor Score for one place, from GET /api/weather.
export default function WeatherCard({ title = 'Night Honor Score', placeName, weather, emptyMessage, children, headingLevel }) {
  const { data, error, loading, retry } = weather
  return (
    <Card title={title} icon={Sparkles} headingLevel={headingLevel} badge={data && <StatusBadge dataKind={data.data_kind} />}>
      {placeName && <p className="weather-place">{placeName}</p>}
      {loading && <Skeleton lines={4} label="Reading the sky" />}
      {error && <ErrorBox error={error} onRetry={retry} />}
      {!loading && !error && !data && <EmptyState message={emptyMessage} />}
      {data && (
        <>
          <ScoreGauge score={data.night_honor_score} size={170} />
          <dl className="facts">
            <dt>Cloud cover</dt>
            <dd>{formatPercent(data.cloud_cover_percent)}</dd>
            <dt>Humidity</dt>
            <dd>{formatPercent(data.humidity_percent)}</dd>
            <dt>Visibility</dt>
            <dd>{data.visibility_km === null ? NOT_AVAILABLE : `${data.visibility_km} km`}</dd>
            <dt>As of</dt>
            <dd>{formatDateTime(data.timestamp, data.timezone)}</dd>
          </dl>
          <details className="score-details">
            <summary>How is this scored?</summary>
            <p className="fine-print">{data.score_method}</p>
            <p className="fine-print">{SCORE_NOTE}</p>
          </details>
          <p className="fine-print">{data.attribution}</p>
        </>
      )}
      {children}
    </Card>
  )
}
