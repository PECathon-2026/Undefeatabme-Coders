import { useState } from 'react'
import { useElementWidth } from '../../hooks/useElementWidth.js'
import { niceStep } from '../../lib/chartMath.js'
import './charts.css'

const M = { top: 12, right: 16, bottom: 44, left: 52 }
const HIT_RADIUS = 24 // px: hover snaps to the nearest point within this distance
const MAX_PLOT_H = 380

function ticksFor(max) {
  const step = niceStep(max, 5)
  const out = []
  for (let v = 0; v <= max + 1e-9; v += step) out.push(v)
  return out
}

// Where candidates sit in the image: x right, y down (pixel coordinates, origin top-left).
// `inFilter(source)` dims points outside the current cross-filter.
export default function ScatterPlot({ sources, imageWidth, imageHeight, inFilter, selectedId, onSelect }) {
  const [ref, width] = useElementWidth()
  const [hover, setHover] = useState(null)
  const ratio = imageHeight / imageWidth
  const plotW0 = Math.max(0, width - M.left - M.right)
  const plotH = Math.min(MAX_PLOT_H, plotW0 * ratio)
  const plotW = plotH / ratio
  const height = plotH + M.top + M.bottom
  const sx = (x) => M.left + (x / imageWidth) * plotW
  const sy = (y) => M.top + (y / imageHeight) * plotH

  function nearest(e) {
    const box = e.currentTarget.getBoundingClientRect()
    const px = e.clientX - box.left
    const py = e.clientY - box.top
    let best = null
    let bestD = HIT_RADIUS
    for (const s of sources) {
      const d = Math.hypot(sx(s.x) - px, sy(s.y) - py)
      if (d <= bestD) {
        best = s
        bestD = d
      }
    }
    return best
  }

  // Left/Right step through candidates in id order.
  function onKeyDown(e) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    e.preventDefault()
    const ids = sources.map((s) => s.id).sort((a, b) => a - b)
    const at = ids.indexOf(selectedId)
    const next = e.key === 'ArrowRight' ? ids[(at + 1) % ids.length] : ids[(at - 1 + ids.length) % ids.length]
    onSelect(next)
  }

  const shown = hover ?? sources.find((s) => s.id === selectedId) ?? null
  const ordered = [...sources].sort((a, b) => (a.id === selectedId) - (b.id === selectedId)) // selected drawn last

  return (
    <div className="chart" ref={ref}>
      {width > 0 && (
        <svg
          width={width}
          height={height}
          className="chart-svg chart-scatter"
          tabIndex={0}
          role="group"
          aria-label={`Spatial map of ${sources.length} candidate sources in a ${imageWidth} by ${imageHeight} pixel image. Left and right arrow keys select candidates.`}
          onPointerMove={(e) => setHover(nearest(e))}
          onPointerLeave={() => setHover(null)}
          onClick={(e) => {
            const hit = nearest(e)
            if (hit) onSelect(hit.id)
          }}
          onKeyDown={onKeyDown}
        >
          <rect x={M.left} y={M.top} width={plotW} height={plotH} className="chart-plot-bg" />
          {ticksFor(imageWidth).map((t) => (
            <g key={`x${t}`}>
              <line x1={sx(t)} x2={sx(t)} y1={M.top} y2={M.top + plotH} className="chart-grid" />
              <text x={sx(t)} y={M.top + plotH + 16} className="chart-tick" textAnchor="middle">
                {t}
              </text>
            </g>
          ))}
          {ticksFor(imageHeight).map((t) => (
            <g key={`y${t}`}>
              <line x1={M.left} x2={M.left + plotW} y1={sy(t)} y2={sy(t)} className="chart-grid" />
              <text x={M.left - 8} y={sy(t)} className="chart-tick" textAnchor="end" dominantBaseline="middle">
                {t}
              </text>
            </g>
          ))}
          <text x={M.left + plotW / 2} y={height - 6} className="chart-axis-label" textAnchor="middle">
            x (px)
          </text>
          <text x={14} y={M.top + plotH / 2} className="chart-axis-label" textAnchor="middle" transform={`rotate(-90 14 ${M.top + plotH / 2})`}>
            y (px, downward)
          </text>
          {ordered.map((s) => {
            const selected = s.id === selectedId
            const dim = !inFilter(s)
            return (
              <circle
                key={s.id}
                cx={sx(s.x)}
                cy={sy(s.y)}
                r={selected ? 7 : 4}
                className={`chart-dot ${selected ? 'is-selected' : ''} ${dim ? 'is-dimmed' : ''} ${hover?.id === s.id ? 'is-hover' : ''}`}
              />
            )
          })}
        </svg>
      )}
      {shown && width > 0 && (
        <div className="chart-tooltip" style={{ left: sx(shown.x), top: sy(shown.y) - 12 }} role="presentation">
          <strong>#{shown.id}</strong>
          <span>
            x {shown.x.toFixed(1)}, y {shown.y.toFixed(1)} px · peak {shown.peak_brightness.toFixed(2)} · size ≈ {shown.approx_size_px.toFixed(1)} px
          </span>
        </div>
      )}
    </div>
  )
}
