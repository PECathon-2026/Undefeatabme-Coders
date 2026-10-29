import Card from '../components/Card.jsx'
import EmptyState from '../components/EmptyState.jsx'
import ErrorBox from '../components/ErrorBox.jsx'
import Loading from '../components/Loading.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import { useApiGet } from '../hooks/useApiGet.js'

export default function Watchtower() {
  const { data, error, loading, retry } = useApiGet('/api/locations')
  return (
    <>
      <p className="section-intro">Observing spots near you. The map comes in a later task.</p>
      <Card title="Viewing locations">
        {loading && <Loading label="Finding viewing spots..." />}
        {error && <ErrorBox error={error} onRetry={retry} />}
        {data && data.locations.length === 0 && <EmptyState message="No locations yet." />}
        {data && data.locations.length > 0 && (
          <ul className="item-list">
            {data.locations.map((loc) => (
              <li key={loc.id}>
                <div className="item-title">
                  <strong>{loc.name}</strong>
                  <StatusBadge dataKind={loc.data_kind} />
                </div>
                <p className="mono">
                  {loc.lat}, {loc.lon}
                </p>
                <p className="fine-print">{loc.provenance}</p>
              </li>
            ))}
          </ul>
        )}
        {data?.disclaimer && <p className="disclaimer">{data.disclaimer}</p>}
      </Card>
    </>
  )
}
