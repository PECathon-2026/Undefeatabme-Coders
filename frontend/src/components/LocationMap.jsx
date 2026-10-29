import { useEffect } from 'react'
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import '../lib/leafletIcons.js'

// Chandigarh, the default location in the contract examples.
const DEFAULT_CENTER = [30.7333, 76.7794]

function FlyTo({ point }) {
  const map = useMap()
  useEffect(() => {
    if (point) map.flyTo([point.lat, point.lon], Math.max(map.getZoom(), 11))
  }, [map, point])
  return null
}

export default function LocationMap({ locations, selected, onSelect }) {
  return (
    <div className="map-frame">
      <MapContainer center={DEFAULT_CENTER} zoom={11} className="map" scrollWheelZoom={false}>
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
