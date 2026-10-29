import { useState } from 'react'
import { useElementWidth } from '../../hooks/useElementWidth.js'
import { countTicks } from '../../lib/chartMath.js'
import './charts.css'

const HEIGHT = 220
const M = { top: 12, right: 12, bottom: 44, left: 44 }
const BAR_MAX = 24
const RADIUS = 4

// Column with a 4px rounded data-end and a square baseline.
function barPath(x, y, w, h) {
  if (h <= 0) return ''
  const r = Math.min(RADIUS, w / 2, h)
  return `M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h} Z`
}

// Single-series histogram. `selected` = index of the cross-filter bin (or null).
export default function Histogram({ edges, counts, format, xLabel, describeBin, selected, onSelect }) {
  const [ref, width] = useElementWidth()
  const [hover, setHover] = useState(null)
  const plotW = Math.max(0, width - M.left - M.right)
  const plotH = HEIGHT - M.top - M.bottom
  const ticks = countTicks(Math.max(...counts, 1))
  const top = ticks[ticks.length - 1]
  const binW = plotW / counts.length
  const barW = Math.max(2, Math.min(BAR_MAX, binW - 2))
  const y = (v) => M.top + plotH - (v / top) * plotH
  const labelEvery = Math.ceil(edges.length / Math.max(2, Math.floor(plotW / 44)))

  function onKeyDown(e, i) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onSelect(selected === i ? null : i)
    }
  }

  const tip = hover !== null && (
    <div className="chart-tooltip" style={{ left: M.left + binW * hover + binW / 2, top: y(counts[hover]) - 8 }} role="presentation">
      <strong>{counts[hover]}</strong>
      <span>{describeBin(hover)}</span>
    </div>
  )

  return (
    <div className="chart" ref={ref}>
      {width > 0 && (
        <svg width={width} height={HEIGHT} className="chart-svg" role="group" aria-label={`Histogram by ${xLabel}`}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={M.left} x2={M.left + plotW} y1={y(t)} y2={y(t)} className="chart-grid" />
              <text x={M.left - 8} y={y(t)} className="chart-tick" textAnchor="end" dominantBaseline="middle">
                {t}
              </text>
            </g>
          ))}
          <line x1={M.left} x2={M.left + plotW} y1={y(0)} y2={y(0)} className="chart-axis" />
          {edges.map((e, i) =>
            i % labelEvery === 0 ? (
              <text key={e} x={M.left + binW * i} y={y(0) + 16} className="chart-tick" textAnchor="middle">
                {format(e)}
              </text>
            ) : null,
          )}
          <text x={M.left + plotW / 2} y={HEIGHT - 6} className="chart-axis-label" textAnchor="middle">
            {xLabel}
          </text>
          <text x={12} y={M.top + plotH / 2} className="chart-axis-label" textAnchor="middle" transform={`rotate(-90 12 ${M.top + plotH / 2})`}>
            Candidates
          </text>

          {counts.map((c, i) => {
            const x = M.left + binW * i + (binW - barW) / 2
            const d = barPath(x, y(c), barW, y(0) - y(c))
            const state = selected === null ? '' : selected === i ? 'is-selected' : 'is-dimmed'
            return (
              <g
                key={i}
                className={`chart-bar ${state} ${hover === i ? 'is-hover' : ''}`}
                tabIndex={0}
                role="button"
                aria-pressed={selected === i}
                aria-label={`${describeBin(i)}: ${c} candidate${c === 1 ? '' : 's'}. ${selected === i ? 'Selected as filter.' : 'Press to filter.'}`}
                onPointerEnter={() => setHover(i)}
                onPointerLeave={() => setHover(null)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                onClick={() => onSelect(selected === i ? null : i)}
                onKeyDown={(e) => onKeyDown(e, i)}
              >
                {/* Hit area: the whole bin column, bigger than the bar. */}
                <rect x={M.left + binW * i} y={M.top} width={binW} height={plotH} className="chart-hit" />
                {d && <path d={d} style={{ d: `path("${d}")` }} className="chart-bar-mark" />}
              </g>
            )
          })}
        </svg>
      )}
      {tip}
    </div>
  )
}
