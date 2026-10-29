import Card from '../components/Card.jsx'
import EmptyState from '../components/EmptyState.jsx'

export default function SpiritLens() {
  return (
    <>
      <p className="section-intro">
        Upload a night-sky photo to enhance it and find candidate light sources.
      </p>
      <Card title="Spirit Lens">
        <EmptyState message="Image upload arrives in a later task." />
        <p className="disclaimer">
          Restored images are algorithmic enhancements and detections are candidates, not
          confirmed astronomical objects.
        </p>
      </Card>
    </>
  )
}
