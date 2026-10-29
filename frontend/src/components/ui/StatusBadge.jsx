import './ui.css'

// Shows where a data block comes from, based on the contract's data_kind.
const LABELS = { live: 'LIVE', mock: 'MOCK', curated: 'CURATED', computed: 'COMPUTED' }
const TITLES = {
  live: 'Live data from the API',
  mock: 'Sample data for demonstration, not live',
  curated: 'Curated by the team, not live',
  computed: 'Calculated, not measured',
}

export default function StatusBadge({ dataKind }) {
  const label = LABELS[dataKind] ?? 'UNKNOWN'
  return (
    <span className={`status-badge status-${LABELS[dataKind] ? dataKind : 'unknown'}`} title={TITLES[dataKind]}>
      {label}
    </span>
  )
}
