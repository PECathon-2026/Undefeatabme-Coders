import { Crosshair, Expand, Maximize, Minimize, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import './lens.css'

const MIN_ZOOM = 1
const MAX_ZOOM = 8
const PAN_STEP = 48
const MODES = [
  { id: 'slider', label: 'Slider', needsRestored: true },
  { id: 'side', label: 'Side by side', needsRestored: true },
  { id: 'original', label: 'Original' },
  { id: 'restored', label: 'Restored', needsRestored: true },
]

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))

// Candidate circles in original-pixel coordinates; the viewBox keeps them aligned at any zoom or size.
function Overlay({ width, height, sources, selectedId, onSelect }) {
  const minR = Math.max(width, height) / 160
  return (
    <svg className="viewer-overlay" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">
      {sources.map((s) => (
        <circle
          key={s.id}
          cx={s.x}
          cy={s.y}
          r={Math.max(s.approx_size_px * 1.8, minR)}
          className={`viewer-circle ${s.id === selectedId ? 'is-selected' : ''}`}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => onSelect(s.id)}
        >
          <title>{`Candidate ${s.id}`}</title>
        </circle>
      ))}
    </svg>
  )
}

// One viewport showing transformed content. Pan/zoom state is shared so side-by-side panes stay in sync.
function Pane({ children, stageStyle, transform, dragging, onPointerDown, onPointerMove, onPointerUp, label, paneRef }) {
  return (
    <div
      ref={paneRef}
      className={`viewer-stage ${dragging ? 'is-dragging' : ''}`}
      style={stageStyle}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {children(transform)}
      {label && <span className="viewer-label">{label}</span>}
    </div>
  )
}

export default function ImageViewer({ originalSrc, restoredSrc, width, height, sources, selectedId, onSelectSource, focusRequest }) {
  const rootRef = useRef(null)
  const paneRef = useRef(null)
  const drag = useRef(null)
  const [mode, setMode] = useState('slider')
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [split, setSplit] = useState(50)
  const [showOverlay, setShowOverlay] = useState(true)
  const [dragging, setDragging] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [stage, setStage] = useState({ w: 0, h: 0 })
  const stageRef = useRef({ w: 0, h: 0 })
  const zoomRef = useRef(1)

  useEffect(() => {
    zoomRef.current = zoom
  }, [zoom])

  const effectiveMode = restoredSrc ? mode : 'original'
  const hasOverlay = Boolean(sources)

  // Track the rendered stage size so panning can be clamped to the image edges.
  // On resize (rotation, fullscreen, side-by-side) scale the pan so the same part of the image stays in view.
  useEffect(() => {
    const el = paneRef.current
    if (!el) return undefined
    const observer = new ResizeObserver(([entry]) => {
      const { width: w, height: h } = entry.contentRect
      const prev = stageRef.current
      stageRef.current = { w, h }
      setStage({ w, h })
      if (prev.w && prev.w !== w) {
        const k = w / prev.w
        const z = zoomRef.current
        setPan((p) => ({ x: clamp(p.x * k, w - w * z, 0), y: clamp(p.y * k, h - h * z, 0) }))
      }
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [effectiveMode, fullscreen])

  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === rootRef.current)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  const clampPan = useCallback(
    (p, z) => ({ x: clamp(p.x, stage.w - stage.w * z, 0), y: clamp(p.y, stage.h - stage.h * z, 0) }),
    [stage],
  )

  // Zoom keeping a point (in stage pixels) fixed; defaults to the centre.
  const zoomTo = useCallback(
    (next, anchor = { x: stage.w / 2, y: stage.h / 2 }) => {
      const z = clamp(next, MIN_ZOOM, MAX_ZOOM)
      setPan((p) => {
        const cx = (anchor.x - p.x) / zoom
        const cy = (anchor.y - p.y) / zoom
        return clampPan({ x: anchor.x - cx * z, y: anchor.y - cy * z }, z)
      })
      setZoom(z)
    },
    [stage, zoom, clampPan],
  )

  // Centre a candidate when the parent asks (e.g. a table row was selected).
  useEffect(() => {
    if (!focusRequest || !stage.w) return
    const source = sources?.find((s) => s.id === focusRequest.id)
    if (!source) return
    const z = Math.max(zoom, 3)
    const px = (source.x / width) * stage.w * z
    const py = (source.y / height) * stage.h * z
    setZoom(z)
    setPan(clampPan({ x: stage.w / 2 - px, y: stage.h / 2 - py }, z))
    // Only react to new requests, not to zoom/pan changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusRequest])

  function resetView() {
    setZoom(1)
    setPan({ x: 0, y: 0 })
    setSplit(50)
  }

  function fit() {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }

  async function toggleFullscreen() {
    if (document.fullscreenElement) await document.exitFullscreen()
    else await rootRef.current?.requestFullscreen?.()
  }

  function onPointerDown(e) {
    const rect = e.currentTarget.getBoundingClientRect()
    if (e.target.closest('.viewer-divider')) {
      drag.current = { kind: 'split', rect }
    } else if (zoom > 1) {
      drag.current = { kind: 'pan', startX: e.clientX, startY: e.clientY, pan }
    } else {
      return
    }
    e.currentTarget.setPointerCapture(e.pointerId)
    setDragging(true)
  }

  function onPointerMove(e) {
    const d = drag.current
    if (!d) return
    if (d.kind === 'split') {
      setSplit(clamp(((e.clientX - d.rect.left) / d.rect.width) * 100, 0, 100))
    } else {
      setPan(clampPan({ x: d.pan.x + e.clientX - d.startX, y: d.pan.y + e.clientY - d.startY }, zoom))
    }
  }

  function onPointerUp() {
    drag.current = null
    setDragging(false)
  }

  function onKeyDown(e) {
    const moves = { ArrowLeft: [PAN_STEP, 0], ArrowRight: [-PAN_STEP, 0], ArrowUp: [0, PAN_STEP], ArrowDown: [0, -PAN_STEP] }
    if (moves[e.key] && zoom > 1) {
      e.preventDefault()
      setPan((p) => clampPan({ x: p.x + moves[e.key][0], y: p.y + moves[e.key][1] }, zoom))
    } else if (e.key === '+' || e.key === '=') {
      e.preventDefault()
      zoomTo(zoom * 1.5)
    } else if (e.key === '-') {
      e.preventDefault()
      zoomTo(zoom / 1.5)
    } else if (e.key === '0') {
      e.preventDefault()
      fit()
    }
  }

  const transform = `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`
  const ratio = width / height
  const stageStyle = { aspectRatio: `${width} / ${height}`, '--ratio': ratio }
  const overlay = hasOverlay && showOverlay && (
    <Overlay width={width} height={height} sources={sources} selectedId={selectedId} onSelect={onSelectSource} />
  )
  const layer = (src, alt, t, extraClass = '') => (
    <div className={`viewer-content ${extraClass}`} style={{ transform: t }}>
      <img src={src} alt={alt} draggable="false" />
    </div>
  )
  const paneProps = { stageStyle, transform, dragging, onPointerDown, onPointerMove, onPointerUp }
  const selected = sources?.find((s) => s.id === selectedId)

  return (
    <div className={`viewer ${fullscreen ? 'is-fullscreen' : ''}`} ref={rootRef}>
      <div className="viewer-toolbar">
        <div className="segmented" role="group" aria-label="Comparison mode">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              aria-pressed={effectiveMode === m.id}
              disabled={m.needsRestored && !restoredSrc}
              onClick={() => setMode(m.id)}
            >
              {m.label}
            </button>
          ))}
        </div>
        <div className="viewer-tools">
          <button type="button" className="icon-button" onClick={() => zoomTo(zoom / 1.5)} disabled={zoom <= MIN_ZOOM} aria-label="Zoom out">
            <ZoomOut size={18} aria-hidden="true" />
          </button>
          <label className="viewer-zoom">
            <span className="visually-hidden">Zoom</span>
            <input type="range" min={MIN_ZOOM} max={MAX_ZOOM} step="0.25" value={zoom} onChange={(e) => zoomTo(Number(e.target.value))} />
            <span className="mono">{zoom.toFixed(1)}×</span>
          </label>
          <button type="button" className="icon-button" onClick={() => zoomTo(zoom * 1.5)} disabled={zoom >= MAX_ZOOM} aria-label="Zoom in">
            <ZoomIn size={18} aria-hidden="true" />
          </button>
          <button type="button" className="icon-button" onClick={fit} aria-label="Fit to screen" title="Fit to screen">
            <Expand size={18} aria-hidden="true" />
          </button>
          <button type="button" className="icon-button" onClick={resetView} aria-label="Reset view" title="Reset view">
            <RotateCcw size={18} aria-hidden="true" />
          </button>
          {hasOverlay && (
            <button
              type="button"
              className={`icon-button ${showOverlay ? 'is-on' : ''}`}
              aria-pressed={showOverlay}
              onClick={() => setShowOverlay((v) => !v)}
              aria-label="Show detection overlay"
              title="Detection overlay"
            >
              <Crosshair size={18} aria-hidden="true" />
            </button>
          )}
          <button
            type="button"
            className="icon-button"
            onClick={toggleFullscreen}
            aria-label={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            title={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {fullscreen ? <Minimize size={18} aria-hidden="true" /> : <Maximize size={18} aria-hidden="true" />}
          </button>
        </div>
      </div>

      <div
        className={`viewer-panes mode-${effectiveMode}`}
        tabIndex={0}
        onKeyDown={onKeyDown}
        aria-label="Image viewer. Plus and minus zoom, arrow keys pan when zoomed, 0 fits the image."
        role="group"
      >
        {effectiveMode === 'side' ? (
          <>
            <Pane {...paneProps} paneRef={paneRef} label="Original">
              {(t) => (
                <>
                  {layer(originalSrc, 'Original upload', t)}
                  {overlay && <div className="viewer-content" style={{ transform: t }}>{overlay}</div>}
                </>
              )}
            </Pane>
            <Pane {...paneProps} label="Restored">
              {(t) => (
                <>
                  {layer(restoredSrc, 'Restored image', t, 'fade-in')}
                  {overlay && <div className="viewer-content" style={{ transform: t }}>{overlay}</div>}
                </>
              )}
            </Pane>
          </>
        ) : (
          <Pane {...paneProps} paneRef={paneRef} label={effectiveMode === 'original' ? 'Original' : effectiveMode === 'restored' ? 'Restored' : null}>
            {(t) => (
              <>
                {effectiveMode !== 'restored' && layer(originalSrc, 'Original upload', t)}
                {effectiveMode === 'restored' && layer(restoredSrc, 'Restored image', t, 'fade-in')}
                {effectiveMode === 'slider' && (
                  <div className="viewer-clip" style={{ clipPath: `inset(0 0 0 ${split}%)` }}>
                    {layer(restoredSrc, 'Restored image', t, 'fade-in')}
                  </div>
                )}
                {overlay && <div className="viewer-content" style={{ transform: t }}>{overlay}</div>}
                {effectiveMode === 'slider' && (
                  <>
                    <div className="viewer-divider" style={{ left: `${split}%` }}>
                      <span className="viewer-handle" />
                    </div>
                    <span className="viewer-label viewer-label-left">Original</span>
                    <span className="viewer-label viewer-label-right">Restored</span>
                  </>
                )}
              </>
            )}
          </Pane>
        )}
      </div>

      {effectiveMode === 'slider' && (
        <label className="range-field viewer-split">
          <span>Original ↔ Restored</span>
          <input
            type="range"
            min="0"
            max="100"
            value={Math.round(split)}
            onChange={(e) => setSplit(Number(e.target.value))}
            aria-valuetext={`${Math.round(split)}% original, ${100 - Math.round(split)}% restored`}
          />
        </label>
      )}

      {selected && (
        <p className="viewer-info" role="status">
          <strong>Candidate #{selected.id}</strong> · x <span className="mono">{selected.x.toFixed(1)}</span> · y{' '}
          <span className="mono">{selected.y.toFixed(1)}</span> px · peak <span className="mono">{selected.peak_brightness.toFixed(2)}</span>{' '}
          (pixel value) · size ≈ <span className="mono">{selected.approx_size_px.toFixed(1)}</span> px (estimate)
        </p>
      )}
      <p className="fine-print viewer-hint">
        {ratio ? `${width}×${height} px · ` : ''}Drag the divider to compare · drag to pan when zoomed · keyboard: + / − zoom, arrows pan, 0 fit
      </p>
    </div>
  )
}
