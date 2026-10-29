import Card from '../components/Card.jsx'
import ErrorBox from '../components/ErrorBox.jsx'
import Loading from '../components/Loading.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import WeatherCard from '../components/WeatherCard.jsx'
import { useApiGet } from '../hooks/useApiGet.js'
import { USE_MOCK } from '../services/api.js'

// Chandigarh, the default location in the contract examples.
const WEATHER_PATH = '/api/weather?lat=30.7333&lon=76.7794'

function HealthCard() {
  const { data, error, loading, retry } = useApiGet('/api/health')
  // /api/health has no data_kind, so mark it by the app's mode.
  const badge = <StatusBadge dataKind={USE_MOCK ? 'mock' : 'live'} />
  return (
    <Card title="Backend" badge={!loading && !error ? badge : null}>
      {loading && <Loading label="Checking backend..." />}
      {error && <ErrorBox error={error} onRetry={retry} />}
      {data && <p className="mono">Backend status: {data.status}</p>}
    </Card>
  )
}

export default function DojoDashboard() {
  const weather = useApiGet(WEATHER_PATH)
  return (
    <>
      <p className="section-intro">Tonight at a glance. Full dashboard comes in a later task.</p>
      <div className="card-grid">
        <HealthCard />
        <WeatherCard weather={weather} placeName="Chandigarh (default)" />
      </div>
    </>
  )
}
