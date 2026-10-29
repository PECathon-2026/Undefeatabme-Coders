import { Crosshair } from 'lucide-react'
import { useEffect, useRef } from 'react'
import './lens.css'

// Candidate sources from the API. Selecting a row highlights and centres it in the viewer.
export default function DetectionTable({ sources, selectedId, onSelect }) {
  const bodyRef = useRef(null)

  // Keep the selected row visible (e.g. after clicking a circle in the image).
  useEffect(() => {
    bodyRef.current?.querySelector('.is-selected')?.scrollIntoView({ block: 'nearest' })
  }, [selectedId])

  return (
    <div className="table-scroll detection-table-wrap">
      <table className="data-table detection-table">
        <caption>
          Pixel coordinates from the top-left of the original image. Peak brightness is a normalised pixel value (0–1), not a
          calibrated measurement; size is an estimate.
        </caption>
        <thead>
          <tr>
            <th scope="col">#</th>
            <th scope="col">Class</th>
            <th scope="col">x (px)</th>
            <th scope="col">y (px)</th>
            <th scope="col">Peak (0–1)</th>
            <th scope="col">Size ≈ (px)</th>
            <th scope="col">Confidence</th>
          </tr>
        </thead>
        <tbody ref={bodyRef}>
          {sources.map((s) => (
            <tr key={s.id} className={s.id === selectedId ? 'is-selected' : ''}>
              <td>
                <button
                  type="button"
                  className="row-locate"
                  aria-pressed={s.id === selectedId}
                  aria-label={`Show candidate ${s.id} in the image`}
                  onClick={() => onSelect(s.id)}
                >
                  <Crosshair size={14} aria-hidden="true" />
                  {s.id}
                </button>
              </td>
              <td className="cell-muted">candidate</td>
              <td>{s.x.toFixed(1)}</td>
              <td>{s.y.toFixed(1)}</td>
              <td>{s.peak_brightness.toFixed(2)}</td>
              <td>{s.approx_size_px.toFixed(1)}</td>
              <td className="cell-muted">–</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
