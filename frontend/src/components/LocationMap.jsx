import { useEffect } from 'react'
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import '../lib/leafletIcons.js'
import { DEFAULT_PLACE, prefersReducedMotion } from '../lib/places.js'

function FlyTo({ point }) {
  const map = useMap()
  useEffect(() => {
    if (!point) return
    const target = [point.lat, point.lon]
    const zoom = Math.max(map.getZoom(), 11)
    if (prefersReducedMotion()) map.setView(target, zoom)
    else map.flyTo(target, zoom)
  }, [map, point])
  return null
}

export default function LocationMap({ locations, selected, onSelect }) {
  return (
    <div className="map-frame">
      <MapContainer center={[(selected ?? DEFAULT_PLACE).lat, (selected ?? DEFAULT_PLACE).lon]} zoom={11} className="map" scrollWheelZoom={false}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {locations.map((loc) => (
          <Marker
            key={loc.id}
            position={[loc.lat, loc.lon]}
            title={loc.name}
            eventHandlers={{ click: () => onSelect({ lat: loc.lat, lon: loc.lon, name: loc.name }) }}
          >
            <Popup>{loc.name}</Popup>
          </Marker>
        ))}
        {selected?.isUser && (
          <Marker position={[selected.lat, selected.lon]} title="Your location">
            <Popup>Your location</Popup>
          </Marker>
        )}
        <FlyTo point={selected} />
      </MapContainer>
    </div>
  )
}
