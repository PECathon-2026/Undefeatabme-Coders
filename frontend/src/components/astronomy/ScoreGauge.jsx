import { scoreBand } from '../../lib/score.js'
import './astronomy.css'

const R = 52
const CIRCUMFERENCE = 2 * Math.PI * R
const ARC = CIRCUMFERENCE * 0.75 // 270 degree instrument dial

// Circular dial for the backend's Night Honor Score (0-100).
export default function ScoreGauge({ score, size = 180 }) {
  const band = scoreBand(score)
  const value = band ? Math.max(0, Math.min(100, score)) : 0
  const label = band ? `Night Honor Score ${value} out of 100, ${band.label}` : 'Night Honor Score not available'
  return (
    <figure className={`gauge gauge-${band?.tone ?? 'none'}`} style={{ width: size }}>
      <svg viewBox="0 0 120 120" role="img" aria-label={label}>
        <g transform="rotate(135 60 60)">
          <circle className="gauge-track" cx="60" cy="60" r={R} strokeDasharray={`${ARC} ${CIRCUMFERENCE}`} />
          <circle
            className="gauge-value"
            cx="60"
            cy="60"
            r={R}
            strokeDasharray={`${(ARC * value) / 100} ${CIRCUMFERENCE}`}
          />
        </g>
        {[0, 20, 40, 60, 80, 100].map((t) => {
          const angle = ((135 + (270 * t) / 100) * Math.PI) / 180
          return (
            <line
              key={t}
              className="gauge-tick"
              x1={60 + Math.cos(angle) * 44}
              y1={60 + Math.sin(angle) * 44}
              x2={60 + Math.cos(angle) * 40}
              y2={60 + Math.sin(angle) * 40}
            />
          )
        })}
        <text x="60" y="62" className="gauge-number" textAnchor="middle">
          {band ? value : '–'}
        </text>
        <text x="60" y="78" className="gauge-max" textAnchor="middle">
          / 100
        </text>
      </svg>
      <figcaption className="gauge-band">{band ? band.label : 'not available'}</figcaption>
    </figure>
  )
}
