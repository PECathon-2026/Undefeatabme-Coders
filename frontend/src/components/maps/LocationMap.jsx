import L from 'leaflet'
import { useEffect, useMemo, useState } from 'react'
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { DEFAULT_PLACE, prefersReducedMotion } from '../../lib/places.js'
import './maps.css'

// Markers are plain HTML (vermilion lantern pin with a gold ring), styled in maps.css.
function pinIcon(selected) {
  return L.divIcon({
    className: `tw-pin ${selected ? 'is-selected' : ''}`,
    html: '<span class="tw-pin-head"><span class="tw-pin-dot"></span></span><span class="tw-pin-tail"></span>',
    iconSize: selected ? [36, 46] : [28, 36],
    iconAnchor: selected ? [18, 46] : [14, 36],
    popupAnchor: [0, selected ? -42 : -32],
  })
}

const USER_ICON = L.divIcon({
  className: 'tw-user',
  html: '<span class="tw-user-pulse"></span><span class="tw-user-dot"></span>',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
})

function FlyTo({ point }) {
  const map = useMap()
  useEffect(() => {
    if (!point) return
    const target = [point.lat, point.lon]
    const zoom = Math.max(map.getZoom(), 11)
    if (prefersReducedMotion()) map.setView(target, zoom)
    else map.flyTo(target, zoom, { duration: 0.8 })
  }, [map, point])
  return null
}

// Interactive Leaflet map of curated locations. `items` = [{ location, score }].
export default function LocationMap({ items, selectedId, userPosition, focusPoint, onSelect, onTilesFailed }) {
  const [failedTiles, setFailedTiles] = useState(0)
  const icons = useMemo(() => ({ normal: pinIcon(false), selected: pinIcon(true) }), [])
  const start = focusPoint ?? DEFAULT_PLACE

  function handleTileError() {
    setFailedTiles((n) => {
      if (n + 1 === 4) onTilesFailed?.()
      return n + 1
    })
  }

  return (
    <div className="map-frame">
      <MapContainer center={[start.lat, start.lon]} zoom={11} className="map" scrollWheelZoom={false}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          eventHandlers={{ tileerror: handleTileError }}
        />
        {items.map(({ location, score }) => (
          <Marker
            key={location.id}
            position={[location.lat, location.lon]}
            icon={location.id === selectedId ? icons.selected : icons.normal}
            title={location.name}
            alt={location.name}
            zIndexOffset={location.id === selectedId ? 1000 : 0}
            eventHandlers={{
              click: () => onSelect(location),
              // Leaflet markers are divs with role="button"; browsers don't click them on Enter/Space.
              keydown: (e) => {
                if (e.originalEvent.key === 'Enter' || e.originalEvent.key === ' ') {
                  e.originalEvent.preventDefault()
                  onSelect(location)
                }
              },
            }}
          >
            <Popup>
              <strong>{location.name}</strong>
              <br />
              {score === null || score === undefined ? 'Score loading or unavailable' : `Night Honor Score ${score}/100`}
            </Popup>
          </Marker>
        ))}
        {userPosition && (
          <Marker position={[userPosition.lat, userPosition.lon]} icon={USER_ICON} title="Your location" alt="Your location" />
        )}
        <FlyTo point={focusPoint} />
      </MapContainer>
      {failedTiles >= 4 && (
        <p className="map-fallback" role="status">
          Map tiles could not load (offline or blocked). Markers still work; the list view shows every location.
        </p>
      )}
    </div>
  )
}
