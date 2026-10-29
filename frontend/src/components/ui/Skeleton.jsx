import './ui.css'

// Shimmering placeholder lines while data loads. Announced once via the label.
export default function Skeleton({ lines = 3, label = 'Loading' }) {
  return (
    <div className="skeleton" role="status" aria-label={label}>
      {Array.from({ length: lines }, (_, i) => (
        <span key={i} className="skeleton-line" style={{ width: `${90 - i * 18}%` }} />
      ))}
    </div>
  )
}
