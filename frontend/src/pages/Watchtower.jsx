import { Heart, List, LocateFixed, Map as MapIcon, Search } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import LocationMap from '../components/maps/LocationMap.jsx'
import ErrorBox from '../components/ui/ErrorBox.jsx'
import Skeleton from '../components/ui/Skeleton.jsx'
import { useToast } from '../components/ui/toastContext.js'
import LocationDetail from '../components/watchtower/LocationDetail.jsx'
import LocationList from '../components/watchtower/LocationList.jsx'
import { useApiGet } from '../hooks/useApiGet.js'
import { useLocationScores } from '../hooks/useLocationScores.js'
import { toggleFavorite, useFavorites } from '../lib/favorites.js'
import { distanceKm } from '../lib/geo.js'
import { DEFAULT_PLACE, weatherPath } from '../lib/places.js'
import './watchtower.css'

const GEO_ERRORS = {
  1: 'Location permission was denied. Distances are measured from Chandigarh centre instead.',
  2: 'Your location is not available right now.',
  3: 'Finding your location took too long.',
}

const SORTS = {
  score: { label: 'Highest Night Honor Score' },
  distance: { label: 'Nearest first' },
  cloud: { label: 'Lowest cloud cover' },
}

const RADII = [
  { value: 'any', label: 'Any distance' },
  { value: '10', label: 'Within 10 km' },
  { value: '25', label: 'Within 25 km' },
  { value: '50', label: 'Within 50 km' },
  { value: '100', label: 'Within 100 km' },
]

// Missing values sort last.
function compareNullable(a, b, direction) {
  if (a === null || a === undefined) return 1
  if (b === null || b === undefined) return -1
  return direction * (a - b)
}

export default function Watchtower({ place, onPlaceChange }) {
  const locations = useApiGet('/api/locations')
  const list = useMemo(() => locations.data?.locations ?? [], [locations.data])
  const scores = useLocationScores(list)
  const favorites = useFavorites()
  const toast = useToast()
  const detailRef = useRef(null)

  const [view, setView] = useState('map')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('score')
  const [radius, setRadius] = useState('any')
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [userPosition, setUserPosition] = useState(place?.isUser ? place : null)
  const [geo, setGeo] = useState({ locating: false, error: null })
  const [focusPoint, setFocusPoint] = useState(place)

  // Changing the selection aborts any weather request still in flight.
  const weather = useApiGet(weatherPath(place))
  const reference = userPosition ?? DEFAULT_PLACE
  const distanceFrom = userPosition ? 'from you' : 'from Chandigarh centre'

  const rows = useMemo(() => {
    const byId = Object.fromEntries(scores.results.map((r) => [r.location.id, r.weather]))
    const q = query.trim().toLowerCase()
    return list
      .map((location) => ({ location, weather: byId[location.id] ?? null, distance: distanceKm(reference, location) }))
      .filter((r) => !q || r.location.name.toLowerCase().includes(q))
      .filter((r) => radius === 'any' || r.distance <= Number(radius))
      .filter((r) => !favoritesOnly || favorites.includes(r.location.id))
      .sort((a, b) => {
        if (sort === 'distance') return a.distance - b.distance
        if (sort === 'cloud') return compareNullable(a.weather?.cloud_cover_percent, b.weather?.cloud_cover_percent, 1)
        return compareNullable(a.weather?.night_honor_score, b.weather?.night_honor_score, -1)
      })
  }, [list, scores.results, query, radius, favoritesOnly, favorites, sort, reference])

  const selectedLocation = list.find((l) => l.id === place?.id) ?? null
  const mapItems = rows.map((r) => ({ location: r.location, score: r.weather?.night_honor_score }))

  function select(location) {
    const next = { id: location.id, lat: location.lat, lon: location.lon, name: location.name }
    onPlaceChange(next)
    setFocusPoint(next)
    // On narrow screens the detail panel sits below; bring it into view.
    if (window.matchMedia('(max-width: 1099px)').matches) {
      requestAnimationFrame(() => detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
    }
  }

  function locateMe() {
    if (!navigator.geolocation) {
      setGeo({ locating: false, error: 'This browser cannot share your location.' })
      return
    }
    setGeo({ locating: true, error: null })
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const me = { lat: pos.coords.latitude, lon: pos.coords.longitude, name: 'Your location', isUser: true }
        setGeo({ locating: false, error: null })
        setUserPosition(me)
        onPlaceChange(me)
        setFocusPoint(me)
        toast.show('Using your location. Distances are now measured from you.', 'info')
      },
      (err) => setGeo({ locating: false, error: GEO_ERRORS[err.code] ?? err.message }),
      { timeout: 10000, maximumAge: 300000 },
    )
  }

  function viewOnMap() {
    setView('map')
    setFocusPoint({ ...place })
  }

  function handleFavorite() {
    const added = toggleFavorite(selectedLocation.id)
    toast.show(added ? `${selectedLocation.name} saved to favourites.` : `${selectedLocation.name} removed from favourites.`)
  }

  const selectedDistance = place && !place.isUser ? distanceKm(reference, place) : null
  const emptyMessage = favoritesOnly && favorites.length === 0 ? 'No favourites yet. Open a location and press "Save to favourites".' : 'No locations match these filters.'

  return (
    <>
      <form className="wt-toolbar" role="search" aria-label="Find viewing locations" onSubmit={(e) => e.preventDefault()}>
        <label className="field wt-search">
          <span>Search by place name</span>
          <span className="input-with-icon">
            <Search size={16} aria-hidden="true" />
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="e.g. Sukhna" />
          </span>
        </label>
        <label className="field">
          <span>Sort by</span>
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            {Object.entries(SORTS).map(([value, { label }]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
            <option value="light" disabled>
              Lowest light pollution (no data yet)
            </option>
          </select>
        </label>
        <label className="field">
          <span>Distance {distanceFrom}</span>
          <select value={radius} onChange={(e) => setRadius(e.target.value)}>
            {RADII.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </label>
        <div className="wt-toolbar-actions">
          <button
            type="button"
            className={`button button-small ${favoritesOnly ? 'is-favorite' : ''}`}
            aria-pressed={favoritesOnly}
            onClick={() => setFavoritesOnly((v) => !v)}
          >
            <Heart size={16} aria-hidden="true" fill={favoritesOnly ? 'currentColor' : 'none'} />
            Favourites{favorites.length > 0 ? ` (${favorites.length})` : ''}
          </button>
          <div className="segmented" role="group" aria-label="View">
            <button type="button" aria-pressed={view === 'map'} onClick={() => setView('map')}>
              <MapIcon size={16} aria-hidden="true" />
              Map
            </button>
            <button type="button" aria-pressed={view === 'list'} onClick={() => setView('list')}>
              <List size={16} aria-hidden="true" />
              List
            </button>
          </div>
          <button type="button" className="button button-small" onClick={locateMe} disabled={geo.locating}>
            <LocateFixed size={16} aria-hidden="true" />
            {geo.locating ? 'Locating...' : 'Use my location'}
          </button>
        </div>
      </form>

      {geo.error && (
        <p className="inline-error wt-geo-error" role="alert">
          {geo.error}
        </p>
      )}

      <div className="wt-layout">
        <section className="wt-main" aria-label={view === 'map' ? 'Map of viewing locations' : 'List of viewing locations'}>
          <p className="fine-print wt-meta" role="status">
            {locations.data
              ? `${rows.length} of ${list.length} curated locations · sorted by ${SORTS[sort].label.toLowerCase()}`
              : ' '}
          </p>
          {locations.error && <ErrorBox error={locations.error} onRetry={locations.retry} />}
          {locations.loading && <Skeleton lines={4} label="Loading viewing locations" />}
          {locations.data && view === 'map' && (
            <LocationMap
              items={mapItems}
              selectedId={place?.id}
              userPosition={userPosition}
              focusPoint={focusPoint}
              onSelect={select}
            />
          )}
          {locations.data && view === 'list' && (
            <LocationList
              rows={rows}
              selectedId={place?.id}
              favorites={favorites}
              scoresLoading={scores.loading}
              onSelect={select}
              emptyMessage={emptyMessage}
            />
          )}
          {locations.data && view === 'map' && rows.length === 0 && <p className="fine-print">{emptyMessage}</p>}
          {locations.data?.disclaimer && <p className="disclaimer">{locations.data.disclaimer}</p>}
          <p className="fine-print">Search covers the team’s curated spots. Searching any town or address needs a geocoding service in the backend.</p>
        </section>

        <aside className="wt-detail" ref={detailRef} aria-label="Selected location">
          <LocationDetail
            place={place}
            location={selectedLocation}
            weather={weather}
            distance={selectedDistance}
            distanceFrom={distanceFrom}
            isFavorite={selectedLocation ? favorites.includes(selectedLocation.id) : false}
            onToggleFavorite={handleFavorite}
            onViewOnMap={viewOnMap}
          />
        </aside>
      </div>
    </>
  )
}
