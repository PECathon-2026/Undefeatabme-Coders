// Shows where a data block comes from, based on the contract's data_kind.
const LABELS = { live: 'LIVE', mock: 'MOCK', curated: 'CURATED', computed: 'COMPUTED' }

export default function StatusBadge({ dataKind }) {
  const label = LABELS[dataKind] ?? 'UNKNOWN'
  return (
    <span className={`status-badge status-${dataKind ?? 'unknown'}`} title={`data_kind: ${dataKind}`}>
      {label}
    </span>
  )
}
