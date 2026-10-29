import { Cloud, Heart } from 'lucide-react'
import EmptyState from '../ui/EmptyState.jsx'
import StatusBadge from '../ui/StatusBadge.jsx'
import { formatKm } from '../../lib/geo.js'
import { scoreBand } from '../../lib/score.js'
import './watchtower.css'

// Sorted, filtered locations as selectable rows. `rows` = [{ location, weather, distance }].
export default function LocationList({ rows, selectedId, favorites, scoresLoading, onSelect, emptyMessage }) {
  if (rows.length === 0) return <EmptyState message={emptyMessage} />
  return (
    <ul className="location-list">
      {rows.map(({ location, weather, distance }) => {
        const score = weather?.night_honor_score
        const band = scoreBand(score)
        const selected = location.id === selectedId
        return (
          <li key={location.id}>
            <button
              type="button"
              className={`location-row ${selected ? 'is-selected' : ''}`}
              aria-pressed={selected}
              onClick={() => onSelect(location)}
            >
              <span className={`row-score row-${band?.tone ?? 'none'}`} aria-hidden="true">
                {band ? score : scoresLoading ? '…' : '–'}
              </span>
              <span className="row-main">
                <span className="row-name">
                  {location.name}
                  {favorites.includes(location.id) && <Heart size={14} fill="currentColor" className="row-fav" aria-label="Favourite" />}
                </span>
                <span className="row-meta">
                  {band ? `${band.label}` : scoresLoading ? 'Scoring...' : 'Score unavailable'}
                  {weather && weather.cloud_cover_percent !== null && (
                    <>
                      {' · '}
                      <Cloud size={12} aria-hidden="true" /> {weather.cloud_cover_percent}% cloud
                    </>
                  )}
                  {' · '}
                  <span className="mono">{formatKm(distance)}</span>
                </span>
              </span>
              <StatusBadge dataKind={location.data_kind} />
              <span className="visually-hidden">{band ? `, score ${score} out of 100` : ''}</span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
