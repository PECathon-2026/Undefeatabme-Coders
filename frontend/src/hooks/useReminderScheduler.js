import { useEffect } from 'react'
import { useToast } from '../components/ui/toastContext.js'
import { getReminders, logNotification, updateReminder } from '../lib/events.js'
import { formatDateTime } from '../lib/format.js'

const CHECK_EVERY_MS = 20000
const GRACE_MS = 60 * 60 * 1000 // still remind up to an hour after the event started

// Checks saved reminders while the app is open and fires due ones as a toast and,
// if permitted, a browser notification. Background delivery would need backend push support.
export function useReminderScheduler() {
  const toast = useToast()

  useEffect(() => {
    function check() {
      const now = Date.now()
      for (const r of getReminders()) {
        if (r.status !== 'pending') continue
        const start = new Date(r.start_time).getTime()
        const fireAt = start - r.minutesBefore * 60000
        if (now < fireAt) continue
        if (now > start + GRACE_MS) {
          updateReminder(r.eventId, { status: 'missed' })
          continue
        }
        const message = `Reminder: ${r.title} at ${formatDateTime(r.start_time, r.timezone)}`
        toast.show(message, 'info')
        logNotification(message)
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Tsukuyomi Watch', { body: message, icon: '/favicon.svg', tag: r.eventId })
        }
        updateReminder(r.eventId, { status: 'sent' })
      }
    }
    check()
    const timer = setInterval(check, CHECK_EVERY_MS)
    return () => clearInterval(timer)
  }, [toast])
}
