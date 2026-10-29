import { Cloud, Droplets, Eye, Heart, Map as MapIcon, MapPin, Wind } from 'lucide-react'
import ScoreGauge from '../astronomy/ScoreGauge.jsx'
import Card from '../ui/Card.jsx'
import EmptyState from '../ui/EmptyState.jsx'
import ErrorBox from '../ui/ErrorBox.jsx'
import MetricCard from '../ui/MetricCard.jsx'
import Skeleton from '../ui/Skeleton.jsx'
import StatusBadge from '../ui/StatusBadge.jsx'
import Unavailable from '../ui/Unavailable.jsx'
import { formatDateTime } from '../../lib/format.js'
import { formatKm } from '../../lib/geo.js'
import { SCORE_NOTE, scoreBand } from '../../lib/score.js'
import './watchtower.css'

// Everything we know about the selected place. Weather comes from GET /api/weather.
export default function LocationDetail({ place, location, weather, distance, distanceFrom, isFavorite, onToggleFavorite, onViewOnMap }) {
  if (!place) {
    return (
      <Card title="Location details" icon={MapPin} className="location-detail">
        <EmptyState icon={MapPin} message="Select a viewing spot on the map or in the list, or use your location." />
      </Card>
    )
  }

  const { data, error, loading, retry } = weather
  const band = scoreBand(data?.night_honor_score)

  return (
    <Card
      title={place.name}
      icon={MapPin}
      className="location-detail"
      badge={location ? <StatusBadge dataKind={location.data_kind} /> : null}
    >
      <p className="mono detail-coords">
        {place.lat.toFixed(4)}, {place.lon.toFixed(4)}
        {distance !== null && (
          <span className="detail-distance">
            {' '}
            · {formatKm(distance)} {distanceFrom}
          </span>
        )}
      </p>

      <div className="detail-actions">
        <button type="button" className="button button-small" onClick={onViewOnMap}>
          <MapIcon size={16} aria-hidden="true" />
          View on map
        </button>
        {location && (
          <button
            type="button"
            className={`button button-small ${isFavorite ? 'is-favorite' : ''}`}
            aria-pressed={isFavorite}
            onClick={onToggleFavorite}
          >
            <Heart size={16} aria-hidden="true" fill={isFavorite ? 'currentColor' : 'none'} />
            {isFavorite ? 'Saved to favourites' : 'Save to favourites'}
          </button>
        )}
      </div>

      {loading && <Skeleton lines={5} label="Reading the sky" />}
      {error && <ErrorBox error={error} onRetry={retry} />}
      {data && (
        <>
          <div className="detail-score">
            <ScoreGauge score={data.night_honor_score} size={176} />
            <StatusBadge dataKind={data.data_kind} />
          </div>
          <p className="fine-print detail-note">
            {band ? `${band.label} conditions. ` : ''}
            {SCORE_NOTE}
          </p>
          <div className="metric-stack">
            <MetricCard layout="row" label="Cloud cover" icon={Cloud} value={data.cloud_cover_percent} unit="%" />
            <MetricCard layout="row" label="Humidity" icon={Droplets} value={data.humidity_percent} unit="%" />
            <MetricCard layout="row" label="Visibility" icon={Eye} value={data.visibility_km} unit="km" />
            <MetricCard layout="row" label="Wind" icon={Wind} value={null} note="Not provided by the API yet." />
          </div>
          <details className="score-details">
            <summary>How is this scored?</summary>
            <p className="fine-print">{data.score_method}</p>
          </details>
          <p className="fine-print">
            As of {formatDateTime(data.timestamp, data.timezone)} · {data.attribution}
          </p>
        </>
      )}

      <Unavailable what="Light pollution" reason="No verified light-pollution data. It is not part of the score." />
      <Unavailable what="Hourly forecast and best observation window" reason="Needs an hourly forecast from the backend API." />

      {location && (
        <p className="fine-print">
          {location.provenance}
          {location.verified ? '' : ' Not verified on site.'}
        </p>
      )}
    </Card>
  )
}
