import { CalendarDays, GanttChart, LayoutGrid, Search } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import EventCard from '../components/events/EventCard.jsx'
import EventDetailDialog from '../components/events/EventDetailDialog.jsx'
import EventTimeline from '../components/events/EventTimeline.jsx'
import FeaturedEvent from '../components/events/FeaturedEvent.jsx'
import LunarCalendar from '../components/events/LunarCalendar.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import ErrorBox from '../components/ui/ErrorBox.jsx'
import Skeleton from '../components/ui/Skeleton.jsx'
import { useToast } from '../components/ui/toastContext.js'
import { useApiGet } from '../hooks/useApiGet.js'
import { useNow } from '../hooks/useNow.js'
import { EVENT_TYPES, ISS_TYPE, toggleSavedEvent, useReminders, useSavedEvents } from '../lib/events.js'
import { addDays, todayIn } from '../lib/format.js'
import './scroll.css'

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const API_TIME_ZONE = 'Asia/Kolkata' // the contract defines dates in Asia/Kolkata

const VIEWS = [
  { id: 'timeline', label: 'Timeline', icon: GanttChart },
  { id: 'list', label: 'List', icon: LayoutGrid },
  { id: 'calendar', label: 'Lunar calendar', icon: CalendarDays },
]
const TABS = [
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'past', label: 'Past' },
  { id: 'saved', label: 'Saved' },
]
const RANGES = [7, 30, 90]

export default function CelestialScroll() {
  const today = todayIn(API_TIME_ZONE)
  const [view, setView] = useState('timeline')
  const [tab, setTab] = useState('upcoming')
  const [types, setTypes] = useState([]) // empty = all types
  const [query, setQuery] = useState('')
  const [fromDate, setFromDate] = useState(today)
  const [range, setRange] = useState(90)
  const [openEvent, setOpenEvent] = useState(null)
  const now = useNow(30000)
  const toast = useToast()
  const saved = useSavedEvents()
  const reminders = useReminders()
  const savedIds = useMemo(() => new Set(saved.map((e) => e.id)), [saved])
  const reminderIds = useMemo(() => new Set(reminders.map((r) => r.eventId)), [reminders])

  const from = DATE_PATTERN.test(fromDate) ? fromDate : today
  const path =
    view === 'calendar' || tab === 'saved'
      ? null
      : `/api/events?type=all&date=${tab === 'past' ? addDays(today, -range) : from}`
  const { data, error, loading, retry } = useApiGet(path)

  const q = query.trim().toLowerCase()
  const filterEvent = useCallback(
    (e) =>
      (types.length === 0 || types.includes(e.type)) &&
      (!q || `${e.title} ${e.description} ${e.source}`.toLowerCase().includes(q)),
    [types, q],
  )

  const events = useMemo(() => {
    if (tab === 'saved') {
      return saved.filter(filterEvent).sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
    }
    const list = (data?.events ?? []).filter(filterEvent)
    if (tab === 'past') {
      return list.filter((e) => new Date(e.start_time) < now).sort((a, b) => new Date(b.start_time) - new Date(a.start_time))
    }
    const end = new Date(`${addDays(from, range)}T00:00:00+05:30`)
    return list.filter((e) => new Date(e.start_time) < end)
  }, [tab, saved, data, filterEvent, now, from, range])

  const featured =
    tab === 'upcoming' && view !== 'calendar'
      ? data?.events.find((e) => e.type !== 'moon_phase' && new Date(e.start_time) >= now)
      : null

  // Tabs pattern: Left/Right arrows move between tabs.
  function onTabKeyDown(e) {
    const delta = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    if (!delta) return
    e.preventDefault()
    const next = TABS[(TABS.findIndex((t) => t.id === tab) + delta + TABS.length) % TABS.length]
    setTab(next.id)
    document.getElementById(`tab-${next.id}`)?.focus()
  }

  function toggleType(type) {
    setTypes((current) => (current.includes(type) ? current.filter((t) => t !== type) : [...current, type]))
  }

  function handleToggleSave(event) {
    const added = toggleSavedEvent(event)
    toast.show(added ? `Saved “${event.title}”.` : `Removed “${event.title}” from saved.`, added ? 'success' : 'info')
  }

  const emptyMessage =
    tab === 'saved'
      ? saved.length === 0
        ? 'No saved events yet. Use the bookmark on any event.'
        : 'No saved events match these filters.'
      : tab === 'past'
        ? 'No past events in this range.'
        : 'No events in this range.'

  const ISSIcon = ISS_TYPE.icon

  return (
    <>
      <div className="scroll-controls">
        <div className="segmented" role="group" aria-label="View">
          {VIEWS.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" aria-pressed={view === id} onClick={() => setView(id)}>
              <Icon size={16} aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>

        <div className="chips" role="group" aria-label="Event types">
          <button type="button" className="chip" aria-pressed={types.length === 0} onClick={() => setTypes([])}>
            All
          </button>
          {Object.entries(EVENT_TYPES).map(([type, { label, icon: Icon }]) => (
            <button key={type} type="button" className={`chip chip-${type}`} aria-pressed={types.includes(type)} onClick={() => toggleType(type)}>
              <Icon size={14} aria-hidden="true" />
              {label}
            </button>
          ))}
          <button type="button" className="chip" disabled title="ISS passes need backend support">
            <ISSIcon size={14} aria-hidden="true" />
            {ISS_TYPE.label}
            <span className="chip-note">needs backend</span>
          </button>
        </div>

        <div className="scroll-filters">
          <label className="field scroll-search">
            <span>Search events</span>
            <span className="input-with-icon">
              <Search size={16} aria-hidden="true" />
              <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="e.g. Leonids, Falcon" />
            </span>
          </label>
          {view !== 'calendar' && tab === 'upcoming' && (
            <label className="field">
              <span>From date</span>
              <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </label>
          )}
          {view !== 'calendar' && tab !== 'saved' && (
            <label className="field">
              <span>{tab === 'past' ? 'Look back' : 'Show next'}</span>
              <select value={range} onChange={(e) => setRange(Number(e.target.value))}>
                {RANGES.map((d) => (
                  <option key={d} value={d}>
                    {d} days
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      </div>

      {view === 'calendar' ? (
        <LunarCalendar filterEvent={filterEvent} onOpen={setOpenEvent} />
      ) : (
        <>
          <div className="tabs" role="tablist" aria-label="Which events">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                id={`tab-${t.id}`}
                aria-selected={tab === t.id}
                tabIndex={tab === t.id ? 0 : -1}
                onKeyDown={onTabKeyDown}
                aria-controls="scroll-panel"
                className="tab"
                onClick={() => setTab(t.id)}
              >
                {t.label}
                {t.id === 'saved' && saved.length > 0 ? ` (${saved.length})` : ''}
              </button>
            ))}
          </div>

          <div id="scroll-panel" role="tabpanel" aria-labelledby={`tab-${tab}`} className="scroll-panel">
            {featured && <FeaturedEvent event={featured} onOpen={setOpenEvent} />}

            {data?.warnings?.length > 0 && (
              <div className="notice-bar" role="status">
                <ul>
                  {data.warnings.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              </div>
            )}

            {(data || tab === 'saved') && (
              <p className="fine-print" role="status">
                {events.length} event{events.length === 1 ? '' : 's'}
                {tab === 'upcoming' && ` · next ${range} days from ${from}`}
                {tab === 'past' && ` · last ${range} days`}
                {tab === 'saved' && ' · saved in this browser'}
              </p>
            )}

            {loading && <Skeleton lines={5} label="Unrolling the scroll" />}
            {error && <ErrorBox error={error} onRetry={retry} />}
            {!loading && !error && events.length === 0 && <EmptyState message={emptyMessage} />}

            {events.length > 0 && view === 'timeline' && (
              <EventTimeline
                events={events}
                savedIds={savedIds}
                reminderIds={reminderIds}
                now={now}
                onOpen={setOpenEvent}
                onToggleSave={handleToggleSave}
              />
            )}
            {events.length > 0 && view === 'list' && (
              <ul className="event-grid">
                {events.map((event) => (
                  <li key={event.id}>
                    <EventCard
                      event={event}
                      saved={savedIds.has(event.id)}
                      hasReminder={reminderIds.has(event.id)}
                      isPast={new Date(event.start_time) < now}
                      onOpen={setOpenEvent}
                      onToggleSave={handleToggleSave}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}

      <p className="fine-print scroll-footnote">
        Moon phases are approximate. Meteor showers and eclipses are curated with sources; launches come from Launch Library
        2. Times are shown in your timezone, with the event’s own timezone alongside when different.
      </p>

      <EventDetailDialog event={openEvent} onClose={() => setOpenEvent(null)} />
    </>
  )
}
