import { BROWSER_TIME_ZONE, formatDateTime } from '../../lib/format.js'

// Start time in the viewer's timezone, plus the event's own timezone when it reads differently.
// (Compare the formatted text, not zone names: Asia/Calcutta and Asia/Kolkata are the same zone.)
export default function EventTime({ event }) {
  const local = formatDateTime(event.start_time, BROWSER_TIME_ZONE)
  const own = formatDateTime(event.start_time, event.timezone)
  return (
    <p className="event-time">
      <time dateTime={event.start_time} className="mono">
        {local}
      </time>
      {own !== local && (
        <span className="fine-print">
          {' '}
          · {own} ({event.timezone})
        </span>
      )}
    </p>
  )
}
