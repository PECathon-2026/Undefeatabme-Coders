// Formats an ISO-8601 timestamp in the given IANA timezone, e.g. "17 Nov 2026, 12:00 am IST".
// Falls back to the raw string if the value or timezone is invalid.
export function formatDateTime(iso, timeZone) {
  try {
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZone,
      timeZoneName: 'short',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

// Today's date as YYYY-MM-DD in the given timezone.
export function todayIn(timeZone) {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone,
  }).format(new Date())
}
