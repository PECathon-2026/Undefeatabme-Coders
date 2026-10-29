import { useState } from 'react'
import './image.css'

// Before/after comparison: two stacked images, the top one clipped with clip-path.
// A range input drives the divider so it works with keyboard, mouse and touch.
export default function CompareSlider({ beforeSrc, afterSrc, width, height }) {
  const [position, setPosition] = useState(50)
  const [zoom, setZoom] = useState(1)

  return (
    <div className="compare">
      <div className="compare-viewport" tabIndex={0} aria-label="Comparison image, scroll to pan when zoomed">
        <div className="compare-stage" style={{ width: `${zoom * 100}%` }}>
          <img src={beforeSrc} alt="Original upload" width={width} height={height} />
          <img
            src={afterSrc}
            alt="Restored image"
            width={width}
            height={height}
            className="compare-after"
            style={{ clipPath: `inset(0 0 0 ${position}%)` }}
          />
          <div className="compare-divider" style={{ left: `${position}%` }} aria-hidden="true" />
          <span className="compare-label compare-label-before">Original</span>
          <span className="compare-label compare-label-after">Restored</span>
        </div>
      </div>
      <div className="compare-controls">
        <label className="range-field">
          <span>Original ↔ Restored</span>
          <input
            type="range"
            min="0"
            max="100"
            value={position}
            onChange={(e) => setPosition(Number(e.target.value))}
            aria-valuetext={`${position}% original, ${100 - position}% restored`}
          />
        </label>
        <label className="range-field">
          <span>Zoom {zoom.toFixed(1)}×</span>
          <input
            type="range"
            min="1"
            max="4"
            step="0.5"
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
          />
        </label>
      </div>
    </div>
  )
}
