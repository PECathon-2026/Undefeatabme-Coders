import Card from '../components/Card.jsx'
import ErrorBox from '../components/ErrorBox.jsx'
import Loading from '../components/Loading.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
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

function WeatherCard() {
  const { data, error, loading, retry } = useApiGet(WEATHER_PATH)
  return (
    <Card title="Night Honor Score" badge={data && <StatusBadge dataKind={data.data_kind} />}>
      {loading && <Loading label="Reading the sky..." />}
      {error && <ErrorBox error={error} onRetry={retry} />}
      {data && (
        <>
          <p className="score">
            {data.night_honor_score ?? '-'}
            <span className="score-max">/100</span>
          </p>
          <dl className="facts">
            <dt>Cloud cover</dt>
            <dd>{data.cloud_cover_percent ?? 'n/a'}%</dd>
            <dt>Humidity</dt>
            <dd>{data.humidity_percent ?? 'n/a'}%</dd>
            <dt>Visibility</dt>
            <dd>{data.visibility_km === null ? 'n/a' : `${data.visibility_km} km`}</dd>
          </dl>
          <p className="fine-print">{data.score_method}</p>
          <p className="fine-print">{data.attribution}</p>
        </>
      )}
    </Card>
  )
}

export default function DojoDashboard() {
  return (
    <>
      <p className="section-intro">Tonight at a glance. Full dashboard comes in a later task.</p>
      <div className="card-grid">
        <HealthCard />
        <WeatherCard />
      </div>
    </>
  )
}
