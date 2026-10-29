import { Bell, Bookmark } from 'lucide-react'
import StatusBadge from '../ui/StatusBadge.jsx'
import { BROWSER_TIME_ZONE } from '../../lib/format.js'
import EventTime from './EventTime.jsx'
import TypeChip from './TypeChip.jsx'
import './events.css'

const monthFmt = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric', timeZone: BROWSER_TIME_ZONE })
const dayFmt = new Intl.DateTimeFormat(undefined, { day: 'numeric', timeZone: BROWSER_TIME_ZONE })
const weekdayFmt = new Intl.DateTimeFormat(undefined, { weekday: 'short', timeZone: BROWSER_TIME_ZONE })

// Events grouped by month along a vertical "scroll" line.
export default function EventTimeline({ events, savedIds, reminderIds, now, onOpen, onToggleSave }) {
  const groups = []
  for (const event of events) {
    const label = monthFmt.format(new Date(event.start_time))
    const last = groups[groups.length - 1]
    if (last?.label === label) last.events.push(event)
    else groups.push({ label, events: [event] })
  }

  return (
    <div className="timeline">
      {groups.map((group) => (
        <section key={group.label} className="timeline-month" aria-label={group.label}>
          <h3 className="timeline-month-title">{group.label}</h3>
          <ol className="timeline-list">
            {group.events.map((event) => {
              const date = new Date(event.start_time)
              const saved = savedIds.has(event.id)
              return (
                <li key={event.id} className={`timeline-item type-${event.type} ${date < now ? 'is-past' : ''}`}>
                  <div className="timeline-date" aria-hidden="true">
                    <span className="timeline-day">{dayFmt.format(date)}</span>
                    <span className="timeline-weekday">{weekdayFmt.format(date)}</span>
                  </div>
                  <span className="timeline-node" aria-hidden="true" />
                  <div className="timeline-body">
                    <div className="event-card-head">
                      <TypeChip type={event.type} />
                      <StatusBadge dataKind={event.data_kind} />
                    </div>
                    <button type="button" className="timeline-title" onClick={() => onOpen(event)}>
                      {event.title}
                    </button>
                    <EventTime event={event} />
                    <div className="timeline-actions">
                      <button
                        type="button"
                        className={`icon-button ${saved ? 'is-saved' : ''}`}
                        aria-pressed={saved}
                        aria-label={saved ? `Remove ${event.title} from saved events` : `Save ${event.title}`}
                        onClick={() => onToggleSave(event)}
                      >
                        <Bookmark size={18} aria-hidden="true" fill={saved ? 'currentColor' : 'none'} />
                      </button>
                      {reminderIds.has(event.id) && (
                        <span className="reminder-flag">
                          <Bell size={14} aria-hidden="true" /> Reminder set
                        </span>
                      )}
                    </div>
                  </div>
                </li>
              )
            })}
          </ol>
        </section>
      ))}
    </div>
  )
}
