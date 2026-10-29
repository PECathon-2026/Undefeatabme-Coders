// Approximate moon phase using the mean synodic month.
// Same constants as backend/app/services/moon.py, so the browser and the API agree.
// Accuracy is roughly ±1 day; always label results as approximate (data_kind "computed").
export const SYNODIC_MONTH_DAYS = 29.53058867
const EPOCH_NEW_MOON_MS = Date.UTC(2000, 0, 6, 18, 14, 0)
const DAY_MS = 86400000

const PHASES = [
  { until: 1 / 16, name: 'New Moon', kanji: '新月' },
  { until: 3 / 16, name: 'Waxing Crescent', kanji: null },
  { until: 5 / 16, name: 'First Quarter', kanji: '上弦' },
  { until: 7 / 16, name: 'Waxing Gibbous', kanji: null },
  { until: 9 / 16, name: 'Full Moon', kanji: '満月' },
  { until: 11 / 16, name: 'Waning Gibbous', kanji: null },
  { until: 13 / 16, name: 'Last Quarter', kanji: '下弦' },
  { until: 15 / 16, name: 'Waning Crescent', kanji: null },
  { until: 1, name: 'New Moon', kanji: '新月' },
]

// fraction: 0 = new, 0.25 = first quarter, 0.5 = full, 0.75 = last quarter.
export function moonPhase(date = new Date()) {
  const days = (date.getTime() - EPOCH_NEW_MOON_MS) / DAY_MS
  const age = ((days % SYNODIC_MONTH_DAYS) + SYNODIC_MONTH_DAYS) % SYNODIC_MONTH_DAYS
  const fraction = age / SYNODIC_MONTH_DAYS
  const illumination = (1 - Math.cos(2 * Math.PI * fraction)) / 2
  const phase = PHASES.find((p) => fraction < p.until)
  return { age, fraction, illumination, waxing: fraction < 0.5, name: phase.name, kanji: phase.kanji }
}

// Next time the moon reaches `targetFraction` (0.5 = full moon) after `date`.
export function nextPhaseDate(targetFraction, date = new Date()) {
  const { fraction } = moonPhase(date)
  let deltaFraction = targetFraction - fraction
  if (deltaFraction <= 0) deltaFraction += 1
  return new Date(date.getTime() + deltaFraction * SYNODIC_MONTH_DAYS * DAY_MS)
}
