import { useEffect, useRef, useState } from 'react'

// Draws candidate sources as SVG circles over the image.
// Source coordinates are in original pixels, so they are scaled by displayedWidth / image_width.
export default function DetectionOverlay({ src, result }) {
  const imgRef = useRef(null)
  const [displayedWidth, setDisplayedWidth] = useState(0)

  useEffect(() => {
    const img = imgRef.current
    if (!img) return undefined
    const observer = new ResizeObserver(([entry]) => setDisplayedWidth(entry.contentRect.width))
    observer.observe(img)
    return () => observer.disconnect()
  }, [])

  const scale = result.image_width ? displayedWidth / result.image_width : 0
  const displayedHeight = result.image_height * scale

  return (
    <div className="overlay-frame">
      <img
        ref={imgRef}
        src={src}
        alt={`Uploaded image with ${result.count} candidate sources marked`}
        width={result.image_width}
        height={result.image_height}
      />
      {scale > 0 && (
        <svg
          className="overlay-svg"
          width={displayedWidth}
          height={displayedHeight}
          aria-hidden="true"
        >
          {result.sources.map((s) => (
            <g key={s.id}>
              <circle
                cx={s.x * scale}
                cy={s.y * scale}
                r={Math.max(s.approx_size_px * scale * 2, 8)}
                className="overlay-circle"
              >
                <title>{`Candidate ${s.id}`}</title>
              </circle>
              <text x={s.x * scale + Math.max(s.approx_size_px * scale * 2, 8) + 3} y={s.y * scale - 4} className="overlay-label">
                {s.id}
              </text>
            </g>
          ))}
        </svg>
      )}
    </div>
  )
}
