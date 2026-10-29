import { Bell, Bookmark, ExternalLink, Trash2 } from 'lucide-react'
import { useState } from 'react'
import Dialog from '../ui/Dialog.jsx'
import StatusBadge from '../ui/StatusBadge.jsx'
import Unavailable from '../ui/Unavailable.jsx'
import { useToast } from '../ui/toastContext.js'
import { useNow } from '../../hooks/useNow.js'
import { REMINDER_OPTIONS, removeReminder, setReminder, toggleSavedEvent, useReminders, useSavedEvents } from '../../lib/events.js'
import EventTime from './EventTime.jsx'
import TypeChip from './TypeChip.jsx'
import './events.css'

const STATUS_TEXT = { pending: 'scheduled', sent: 'sent', missed: 'missed' }

function isUrl(text) {
  return /^https?:\/\//.test(text)
}

function ReminderControl({ event }) {
  const reminder = useReminders().find((r) => r.eventId === event.id)
  const [minutes, setMinutes] = useState(reminder?.minutesBefore ?? 60)
  const toast = useToast()
  const now = useNow(30000)
  const started = new Date(event.start_time) <= now

  if (started) return <p className="fine-print">This event has already started, so reminders are off.</p>

  function save() {
    setReminder(event, minutes)
    const label = REMINDER_OPTIONS.find((o) => o.minutes === minutes)?.label ?? `${minutes} minutes before`
    toast.show(`Reminder ${reminder ? 'updated' : 'set'}: ${label}.`)
  }

  return (
    <div className="reminder-control">
      <label className="field">
        <span>Remind me</span>
        <select value={minutes} onChange={(e) => setMinutes(Number(e.target.value))}>
          {REMINDER_OPTIONS.map((o) => (
            <option key={o.minutes} value={o.minutes}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      <button type="button" className="button button-primary button-small" onClick={save}>
        <Bell size={16} aria-hidden="true" />
        {reminder ? 'Update reminder' : 'Set reminder'}
      </button>
      {reminder && (
        <button
          type="button"
          className="button button-small button-danger"
          onClick={() => {
            removeReminder(event.id)
            toast.show('Reminder removed.', 'info')
          }}
        >
          <Trash2 size={16} aria-hidden="true" />
          Remove
        </button>
      )}
      {reminder && <p className="fine-print reminder-status">Reminder {STATUS_TEXT[reminder.status]}. Fires while the app is open.</p>}
    </div>
  )
}

export default function EventDetailDialog({ event, onClose }) {
  const saved = useSavedEvents().some((e) => e.id === event?.id)
  const toast = useToast()

  return (
    <Dialog open={Boolean(event)} onClose={onClose} title={event?.title ?? 'Event'}>
      {event && (
        <>
          <div className="event-card-head">
            <TypeChip type={event.type} />
            <StatusBadge dataKind={event.data_kind} />
          </div>
          <EventTime event={event} />
          <p>{event.description}</p>
          <p className="fine-print">
            Source:{' '}
            {isUrl(event.source) ? (
              <a href={event.source} target="_blank" rel="noopener noreferrer">
                {event.source} <ExternalLink size={12} aria-hidden="true" />
              </a>
            ) : (
              event.source
            )}
          </p>
          <Unavailable what="Visibility region and best viewing time" reason="Not provided by the events API yet." />
          <ReminderControl key={event.id} event={event} />
          <button
            type="button"
            className={`button button-small ${saved ? 'is-saved' : ''}`}
            aria-pressed={saved}
            onClick={() => {
              const added = toggleSavedEvent(event)
              toast.show(added ? 'Event saved.' : 'Event removed from saved.', added ? 'success' : 'info')
            }}
          >
            <Bookmark size={16} aria-hidden="true" fill={saved ? 'currentColor' : 'none'} />
            {saved ? 'Saved' : 'Save event'}
          </button>
        </>
      )}
    </Dialog>
  )
}
