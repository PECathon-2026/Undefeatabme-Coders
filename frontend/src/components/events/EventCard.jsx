import { Bell, Bookmark } from 'lucide-react'
import StatusBadge from '../ui/StatusBadge.jsx'
import EventTime from './EventTime.jsx'
import TypeChip from './TypeChip.jsx'
import './events.css'

// Compact event card used by the list view.
export default function EventCard({ event, saved, hasReminder, isPast, onOpen, onToggleSave }) {
  return (
    <article className={`event-card ${isPast ? 'is-past' : ''}`}>
      <header className="event-card-head">
        <TypeChip type={event.type} />
        <StatusBadge dataKind={event.data_kind} />
      </header>
      <h3 className="event-title">{event.title}</h3>
      <EventTime event={event} />
      <p className="event-desc">{event.description}</p>
      <footer className="event-card-actions">
        <button type="button" className="button button-small" onClick={() => onOpen(event)}>
          Details{hasReminder ? '' : ' & reminder'}
        </button>
        <button
          type="button"
          className={`icon-button ${saved ? 'is-saved' : ''}`}
          aria-pressed={saved}
          aria-label={saved ? `Remove ${event.title} from saved events` : `Save ${event.title}`}
          title={saved ? 'Saved' : 'Save event'}
          onClick={() => onToggleSave(event)}
        >
          <Bookmark size={18} aria-hidden="true" fill={saved ? 'currentColor' : 'none'} />
        </button>
        {hasReminder && (
          <span className="reminder-flag" title="Reminder set">
            <Bell size={14} aria-hidden="true" /> Reminder set
          </span>
        )}
      </footer>
    </article>
  )
}
