import { Bell } from 'lucide-react'
import StatusBadge from '../ui/StatusBadge.jsx'
import { useNow } from '../../hooks/useNow.js'
import { typeInfo } from '../../lib/events.js'
import EventTime from './EventTime.jsx'
import './events.css'

function countdownParts(ms) {
  const total = Math.max(0, Math.floor(ms / 1000))
  return [
    { value: Math.floor(total / 86400), unit: 'days' },
    { value: Math.floor((total % 86400) / 3600), unit: 'hours' },
    { value: Math.floor((total % 3600) / 60), unit: 'min' },
    { value: total % 60, unit: 'sec' },
  ]
}

// The next major (non moon-phase) event, with a live countdown.
export default function FeaturedEvent({ event, onOpen }) {
  const now = useNow(1000)
  const { single, icon: Icon } = typeInfo(event.type)
  const parts = countdownParts(new Date(event.start_time) - now)
  return (
    <section className={`featured type-${event.type}`} aria-labelledby="featured-title">
      <div className="featured-icon" aria-hidden="true">
        <Icon size={40} />
      </div>
      <div className="featured-main">
        <p className="featured-eyebrow">
          Next major event · {single} <StatusBadge dataKind={event.data_kind} />
        </p>
        <h2 id="featured-title" className="featured-title">
          {event.title}
        </h2>
        <EventTime event={event} />
      </div>
      <div className="featured-side">
        <p className="countdown" aria-label={`Starts in ${parts[0].value} days, ${parts[1].value} hours and ${parts[2].value} minutes`}>
          {parts.map((p) => (
            <span key={p.unit} className="countdown-part" aria-hidden="true">
              <span className="countdown-value mono">{String(p.value).padStart(2, '0')}</span>
              <span className="countdown-unit">{p.unit}</span>
            </span>
          ))}
        </p>
        <button type="button" className="button button-primary button-small" onClick={() => onOpen(event)}>
          <Bell size={16} aria-hidden="true" />
          Details & reminder
        </button>
      </div>
    </section>
  )
}
