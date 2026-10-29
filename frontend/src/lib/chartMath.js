// Small helpers for hand-built SVG charts.

// A "nice" step (1, 2 or 5 × 10^k) that splits `span` into about `count` parts.
export function niceStep(span, count = 5) {
  if (!(span > 0)) return 1
  const raw = span / count
  const power = 10 ** Math.floor(Math.log10(raw))
  const unit = raw / power
  return (unit <= 1 ? 1 : unit <= 2 ? 2 : unit <= 5 ? 5 : 10) * power
}

// Ticks from 0 to a rounded-up max (for counts on a y axis).
export function countTicks(max, count = 4) {
  const step = Math.max(1, niceStep(Math.max(max, 1), count))
  const top = Math.ceil(Math.max(max, 1) / step) * step
  const ticks = []
  for (let v = 0; v <= top + 1e-9; v += step) ticks.push(Math.round(v * 1e6) / 1e6)
  return ticks
}

// Equal-width bins: edges[i] <= value < edges[i + 1] (last bin includes its upper edge).
export function binValues(values, edges) {
  const counts = new Array(edges.length - 1).fill(0)
  for (const v of values) {
    let i = edges.findIndex((e, k) => k < edges.length - 1 && v >= e && v < edges[k + 1])
    if (i === -1 && v === edges[edges.length - 1]) i = edges.length - 2
    if (i >= 0) counts[i] += 1
  }
  return counts
}

export function rangeEdges(min, max, count = 10) {
  const step = niceStep(max - min || 1, count)
  const start = Math.floor(min / step) * step
  const edges = []
  for (let v = start; v < max + step - 1e-9; v += step) edges.push(Math.round(v * 1e6) / 1e6)
  if (edges.length < 2) edges.push(edges[0] + step)
  return edges
}

export function median(values) {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}
