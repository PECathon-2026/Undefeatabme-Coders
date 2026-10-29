import { useState } from 'react'
import Card from '../components/ui/Card.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import ErrorBox from '../components/ui/ErrorBox.jsx'
import Loading from '../components/ui/Loading.jsx'
import LocationMap from '../components/maps/LocationMap.jsx'
import StatusBadge from '../components/ui/StatusBadge.jsx'
import WeatherCard from '../components/weather/WeatherCard.jsx'
import { useApiGet } from '../hooks/useApiGet.js'
import './watchtower.css'
import { weatherPath } from '../lib/places.js'

const GEO_ERRORS = {
  1: 'Location permission was denied.',
  2: 'Your location is not available right now.',
  3: 'Finding your location took too long.',
}

// The selected place lives in App so the Dashboard can use it too.
export default function Watchtower({ place: selected, onPlaceChange: setSelected }) {
  const locations = useApiGet('/api/locations')
  const [geo, setGeo] = useState({ locating: false, error: null })
  // Changing the selection aborts any weather request still in flight.
  const weather = useApiGet(weatherPath(selected))

  function locateMe() {
    if (!navigator.geolocation) {
      setGeo({ locating: false, error: 'This browser cannot share your location.' })
      return
    }
    setGeo({ locating: true, error: null })
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeo({ locating: false, error: null })
        setSelected({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          name: 'Your location',
          isUser: true,
        })
      },
      (err) => setGeo({ locating: false, error: GEO_ERRORS[err.code] ?? err.message }),
      { timeout: 10000, maximumAge: 300000 },
    )
  }

  const list = locations.data?.locations ?? []

  return (
    <>

      <div className="watchtower-grid">
        <Card title="Viewing map">
          <div className="map-toolbar">
            <button type="button" className="button" onClick={locateMe} disabled={geo.locating}>
              {geo.locating ? 'Locating...' : 'Use my location'}
            </button>
          </div>
          {geo.error && <p className="inline-error" role="alert">{geo.error}</p>}
          <LocationMap locations={list} selected={selected} onSelect={setSelected} />
        </Card>

        <WeatherCard
          placeName={selected ? selected.name : null}
          weather={weather}
          emptyMessage="Choose a location on the map or use your location."
        />
      </div>

      <Card title="Viewing locations">
        {locations.loading && <Loading label="Finding viewing spots..." />}
        {locations.error && <ErrorBox error={locations.error} onRetry={locations.retry} />}
        {locations.data && list.length === 0 && <EmptyState message="No locations yet." />}
        {list.length > 0 && (
          <ul className="item-list">
            {list.map((loc) => (
              <li key={loc.id}>
                <div className="item-title">
                  <button
                    type="button"
                    className="link-button"
                    aria-pressed={selected?.name === loc.name && !selected?.isUser}
                    onClick={() => setSelected({ lat: loc.lat, lon: loc.lon, name: loc.name })}
                  >
                    {loc.name}
                  </button>
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
        {locations.data?.disclaimer && <p className="disclaimer">{locations.data.disclaimer}</p>}
      </Card>
    </>
  )
}
