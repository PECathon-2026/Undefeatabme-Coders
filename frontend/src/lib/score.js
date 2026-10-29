// Interpretation bands for the backend's night_honor_score (0-100).
// The score itself always comes from the API; the frontend never computes its own.
const BANDS = [
  { min: 80, label: 'Excellent', tone: 'excellent' },
  { min: 60, label: 'Good', tone: 'good' },
  { min: 40, label: 'Fair', tone: 'fair' },
  { min: 20, label: 'Poor', tone: 'poor' },
  { min: 0, label: 'Unfavorable', tone: 'unfavorable' },
]

export function scoreBand(score) {
  if (score === null || score === undefined || Number.isNaN(score)) return null
  return BANDS.find((b) => score >= b.min) ?? BANDS[BANDS.length - 1]
}

export const SCORE_NOTE = 'Indicative stargazing score from weather only, not a scientific guarantee.'
