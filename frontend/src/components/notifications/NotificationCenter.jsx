import { BellRing, Trash2 } from 'lucide-react'
import { useState } from 'react'
import Dialog from '../ui/Dialog.jsx'
import EmptyState from '../ui/EmptyState.jsx'
import Unavailable from '../ui/Unavailable.jsx'
import { useToast } from '../ui/toastContext.js'
import { REMINDER_OPTIONS, removeReminder, updateReminder, useNotificationLog, useReminders } from '../../lib/events.js'
import { formatDateTime } from '../../lib/format.js'
import './notifications.css'

const STATUS_TEXT = { pending: 'Scheduled', sent: 'Sent', missed: 'Missed (app was closed)' }

function permissionState() {
  return 'Notification' in window ? Notification.permission : 'unsupported'
}

// Reminders, browser-notification permission and recent alerts.
export default function NotificationCenter({ open, onClose }) {
  const reminders = useReminders()
  const log = useNotificationLog()
  const toast = useToast()
  const [permission, setPermission] = useState(permissionState)

  async function enableBrowserNotifications() {
    const result = await Notification.requestPermission()
    setPermission(result)
    toast.show(result === 'granted' ? 'Browser notifications enabled.' : 'Browser notifications were not allowed.', result === 'granted' ? 'success' : 'info')
  }

  const sorted = [...reminders].sort((a, b) => new Date(a.start_time) - new Date(b.start_time))

  return (
    <Dialog open={open} onClose={onClose} title="Notifications">
      <section className="nc-section" aria-labelledby="nc-browser">
        <h3 id="nc-browser">Browser notifications</h3>
        {permission === 'granted' && <p className="nc-ok">Enabled. Reminders also appear as system notifications.</p>}
        {permission === 'default' && (
          <button type="button" className="button button-small" onClick={enableBrowserNotifications}>
            <BellRing size={16} aria-hidden="true" />
            Enable browser notifications
          </button>
        )}
        {permission === 'denied' && <p className="fine-print">Blocked in this browser. Allow notifications in the site settings to receive them; in-app alerts still work.</p>}
        {permission === 'unsupported' && <p className="fine-print">This browser does not support notifications; in-app alerts still work.</p>}
        <p className="fine-print">Reminders fire while Tsukuyomi Watch is open in a tab. Alerts when the app is closed need push support in the backend.</p>
      </section>

      <section className="nc-section" aria-labelledby="nc-reminders">
        <h3 id="nc-reminders">Event reminders</h3>
        {sorted.length === 0 ? (
          <EmptyState message="No reminders yet. Open an event in the Celestial Scroll and choose “Remind me”." />
        ) : (
          <ul className="nc-list">
            {sorted.map((r) => (
              <li key={r.eventId}>
                <div className="nc-item-head">
                  <strong>{r.title}</strong>
                  <span className={`nc-status nc-${r.status}`}>{STATUS_TEXT[r.status]}</span>
                </div>
                <p className="mono fine-print">{formatDateTime(r.start_time, r.timezone)}</p>
                <div className="nc-item-actions">
                  <label className="field nc-time">
                    <span className="visually-hidden">Reminder time for {r.title}</span>
                    <select
                      value={r.minutesBefore}
                      onChange={(e) => {
                        updateReminder(r.eventId, { minutesBefore: Number(e.target.value), status: 'pending' })
                        toast.show('Reminder time updated.')
                      }}
                    >
                      {REMINDER_OPTIONS.map((o) => (
                        <option key={o.minutes} value={o.minutes}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={`Remove reminder for ${r.title}`}
                    onClick={() => {
                      removeReminder(r.eventId)
                      toast.show('Reminder removed.', 'info')
                    }}
                  >
                    <Trash2 size={18} aria-hidden="true" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="nc-section" aria-labelledby="nc-moon">
        <h3 id="nc-moon">Moon alerts</h3>
        <Unavailable what="Moonrise and moonset alerts" />
      </section>

      <section className="nc-section" aria-labelledby="nc-log">
        <h3 id="nc-log">Recent alerts</h3>
        {log.length === 0 ? (
          <p className="fine-print">Nothing yet.</p>
        ) : (
          <ul className="nc-log">
            {log.slice(0, 8).map((n) => (
              <li key={n.at}>
                <span>{n.message}</span>
                <span className="fine-print">{new Intl.DateTimeFormat(undefined, { dateStyle: 'short', timeStyle: 'short' }).format(new Date(n.at))}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </Dialog>
  )
}
