import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import MoonPhase from '../astronomy/MoonPhase.jsx'
import EmptyState from '../ui/EmptyState.jsx'
import ErrorBox from '../ui/ErrorBox.jsx'
import Loading from '../ui/Loading.jsx'
import StatusBadge from '../ui/StatusBadge.jsx'
import { useApiGet } from '../../hooks/useApiGet.js'
import { useNow } from '../../hooks/useNow.js'
import { typeInfo } from '../../lib/events.js'
import { localDateKey } from '../../lib/format.js'
import { moonPhase } from '../../lib/moon.js'
import TypeChip from './TypeChip.jsx'
import './events.css'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const pad = (n) => String(n).padStart(2, '0')
const ymd = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`
const parse = (key) => key.split('-').map(Number)
const noonOf = (key) => {
  const [y, m, d] = parse(key)
  return new Date(y, m - 1, d, 12)
}

// Gregorian month grid with the approximate moon phase for each day and dots for events.
export default function LunarCalendar({ filterEvent, onOpen }) {
  const todayKey = localDateKey(useNow(60000))
  const [selected, setSelected] = useState(() => localDateKey(new Date()))
  const [y, m] = parse(selected)
  const month = { year: y, index: m - 1 }
  const gridRef = useRef(null)
  const focusAfterMove = useRef(false)

  const { data, error, loading, retry } = useApiGet(`/api/events?type=all&date=${ymd(month.year, month.index, 1)}`)

  const byDay = useMemo(() => {
    const map = {}
    for (const event of data?.events ?? []) {
      if (!filterEvent(event)) continue
      const key = localDateKey(new Date(event.start_time))
      if (!map[key]) map[key] = []
      map[key].push(event)
    }
    return map
  }, [data, filterEvent])

  const daysInMonth = new Date(month.year, month.index + 1, 0).getDate()
  const offset = (new Date(month.year, month.index, 1).getDay() + 6) % 7
  const cells = [...Array(offset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => ymd(month.year, month.index, i + 1))]
  const padded = [...cells, ...Array((7 - (cells.length % 7)) % 7).fill(null)]
  const weeks = []
  for (let i = 0; i < padded.length; i += 7) weeks.push(padded.slice(i, i + 7))

  const monthLabel = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(new Date(month.year, month.index, 1))
  const dayLabel = (key) => new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(noonOf(key))

  useEffect(() => {
    if (!focusAfterMove.current) return
    focusAfterMove.current = false
    gridRef.current?.querySelector(`[data-date="${selected}"]`)?.focus()
  }, [selected])

  function moveTo(key, focus = true) {
    focusAfterMove.current = focus
    setSelected(key)
  }

  function shift(days) {
    const date = noonOf(selected)
    date.setDate(date.getDate() + days)
    moveTo(localDateKey(date))
  }

  function shiftMonth(delta, focus = false) {
    const [cy, cm, cd] = parse(selected)
    const target = new Date(cy, cm - 1 + delta, 1)
    const last = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate()
    moveTo(ymd(target.getFullYear(), target.getMonth(), Math.min(cd, last)), focus)
  }

  function onKeyDown(e) {
    const moves = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }
    if (moves[e.key]) {
      e.preventDefault()
      shift(moves[e.key])
    } else if (e.key === 'PageUp' || e.key === 'PageDown') {
      e.preventDefault()
      shiftMonth(e.key === 'PageUp' ? -1 : 1, true)
    }
  }

  const moon = moonPhase(noonOf(selected))
  const dayEvents = byDay[selected] ?? []

  return (
    <div className="lunar">
      <div className="lunar-main">
        <div className="lunar-head">
          <button type="button" className="icon-button" onClick={() => shiftMonth(-1)} aria-label="Previous month">
            <ChevronLeft size={20} aria-hidden="true" />
          </button>
          <h3 className="lunar-month" aria-live="polite">
            {monthLabel}
          </h3>
          <button type="button" className="icon-button" onClick={() => shiftMonth(1)} aria-label="Next month">
            <ChevronRight size={20} aria-hidden="true" />
          </button>
          <button type="button" className="button button-small" onClick={() => moveTo(todayKey, false)}>
            Today
          </button>
        </div>
        <p className="fine-print lunar-note">
          Gregorian calendar. Moon phases are approximate (mean lunar cycle, about ±1 day), computed in your browser. This is
          not the traditional Japanese lunisolar calendar (<span lang="ja">旧暦</span>). Arrow keys move between days; Page Up
          and Page Down change month.
        </p>

        <table className="lunar-grid" ref={gridRef} onKeyDown={onKeyDown}>
          <caption className="visually-hidden">{monthLabel}: moon phases and events</caption>
          <thead>
            <tr>
              {WEEKDAYS.map((d) => (
                <th key={d} scope="col">
                  {d}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {weeks.map((week, wi) => (
              <tr key={wi}>
                {week.map((key, di) => {
                  if (!key) return <td key={`blank-${wi}-${di}`} />
                  const phase = moonPhase(noonOf(key))
                  const events = byDay[key] ?? []
                  const isSelected = key === selected
                  return (
                    <td key={key}>
                      <button
                        type="button"
                        data-date={key}
                        className={`lunar-day ${isSelected ? 'is-selected' : ''} ${key === todayKey ? 'is-today' : ''} ${events.length ? 'has-events' : ''}`}
                        tabIndex={isSelected ? 0 : -1}
                        aria-pressed={isSelected}
                        aria-current={key === todayKey ? 'date' : undefined}
                        aria-label={`${dayLabel(key)}. ${phase.name}. ${events.length ? `${events.length} event${events.length === 1 ? '' : 's'}` : 'No events'}`}
                        onClick={() => moveTo(key, false)}
                      >
                        <span className="lunar-num">{parse(key)[2]}</span>
                        <MoonPhase fraction={phase.fraction} size={22} glow={false} />
                        <span className="lunar-dots" aria-hidden="true">
                          {events.slice(0, 3).map((e) => (
                            <span key={e.id} className={`lunar-dot type-${e.type}`} />
                          ))}
                        </span>
                      </button>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
        {loading && <Loading label="Loading events for this month..." />}
        {error && <ErrorBox error={error} onRetry={retry} />}
      </div>

      <aside className="lunar-day-panel" aria-label="Selected day">
        <p className="lunar-day-title">{dayLabel(selected)}</p>
        <div className="lunar-day-moon">
          <MoonPhase fraction={moon.fraction} size={112} label={`${moon.name}, about ${Math.round(moon.illumination * 100)}% illuminated`} />
          <div>
            <p className="moon-name">
              {moon.name}
              {moon.kanji && (
                <span lang="ja" className="moon-kanji">
                  {moon.kanji}
                </span>
              )}
            </p>
            <p className="fine-print">≈ {Math.round(moon.illumination * 100)}% illuminated</p>
            <StatusBadge dataKind="computed" />
          </div>
        </div>
        <h4 className="lunar-events-title">Events this day</h4>
        {dayEvents.length === 0 ? (
          <EmptyState message={loading ? 'Loading...' : 'No events on this day.'} />
        ) : (
          <ul className="item-list">
            {dayEvents.map((event) => (
              <li key={event.id}>
                <TypeChip type={event.type} />
                <button type="button" className="link-button" onClick={() => onOpen(event)}>
                  {event.title}
                </button>
                <p className="fine-print">
                  {new Intl.DateTimeFormat(undefined, { timeStyle: 'short' }).format(new Date(event.start_time))} ·{' '}
                  {typeInfo(event.type).single}
                </p>
              </li>
            ))}
          </ul>
        )}
      </aside>
    </div>
  )
}
