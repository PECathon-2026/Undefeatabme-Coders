import StatusBadge from './StatusBadge.jsx'
import './ui.css'

// One labelled number with unit. value === null shows "not available"; loading shows a shimmer.
export default function MetricCard({ label, value, unit, icon: Icon, dataKind, loading, note, layout = 'tile' }) {
  const missing = value === null || value === undefined
  return (
    <div className={`metric metric-${layout}`}>
      <div className="metric-head">
        <span className="metric-label">
          {Icon && <Icon size={16} aria-hidden="true" />}
          {label}
        </span>
        {dataKind && !loading && <StatusBadge dataKind={dataKind} />}
      </div>
      {loading ? (
        <span className="skeleton-line metric-skeleton" role="status" aria-label={`Loading ${label}`} />
      ) : (
        <p className={`metric-value ${missing ? 'metric-missing' : ''}`}>
          {missing ? 'not available' : value}
          {!missing && unit && <span className="metric-unit">{unit}</span>}
        </p>
      )}
      {note && <p className="fine-print">{note}</p>}
    </div>
  )
}
