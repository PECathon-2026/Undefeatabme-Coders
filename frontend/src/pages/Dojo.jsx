import { BarChart3, Bell, Bookmark, ChartScatter, FlaskConical, Heart, ImageIcon, ScanEye, X } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import Histogram from '../components/dojo/Histogram.jsx'
import ScatterPlot from '../components/dojo/ScatterPlot.jsx'
import DetectionTable from '../components/lens/DetectionTable.jsx'
import ImageViewer from '../components/lens/ImageViewer.jsx'
import Card from '../components/ui/Card.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import MetricCard from '../components/ui/MetricCard.jsx'
import StatusBadge from '../components/ui/StatusBadge.jsx'
import Unavailable from '../components/ui/Unavailable.jsx'
import { useApiGet } from '../hooks/useApiGet.js'
import { useNow } from '../hooks/useNow.js'
import { useActivity } from '../lib/activity.js'
import { getSessionImages, useAnalysis } from '../lib/analysis.js'
import { binValues, median, rangeEdges } from '../lib/chartMath.js'
import { useReminders, useSavedEvents } from '../lib/events.js'
import { useFavorites } from '../lib/favorites.js'
import { formatDateTime } from '../lib/format.js'
import './dojo.css'

const BRIGHTNESS_EDGES = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1]
const fmt1 = (v) => (Number.isInteger(v) ? String(v) : v.toFixed(1))

function binLabel(edges, i, format, unit = '') {
  return `${format(edges[i])}–${format(edges[i + 1])}${unit}`
}

function BinTable({ edges, counts, format, unit, caption }) {
  return (
    <details className="chart-table">
      <summary>Show data table</summary>
      <table className="data-table">
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">Range</th>
            <th scope="col">Candidates</th>
          </tr>
        </thead>
        <tbody>
          {counts.map((c, i) => (
            <tr key={i}>
              <td>{binLabel(edges, i, format, unit)}</td>
              <td>{c}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  )
}

function inBin(value, edges, i) {
  return value >= edges[i] && (value < edges[i + 1] || (i === edges.length - 2 && value === edges[i + 1]))
}

function AnalysisSection({ analysis, onNavigate }) {
  const detect = analysis.detect
  const sources = detect.sources
  const [minPeak, setMinPeak] = useState(0)
  const [brightBin, setBrightBin] = useState(null)
  const [sizeBin, setSizeBin] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const images = getSessionImages()
  const imagesMatch = images && images.fileName === analysis.fileName

  const sizeEdges = useMemo(() => {
    const sizes = sources.map((s) => s.approx_size_px)
    return rangeEdges(Math.min(...sizes, 0), Math.max(...sizes, 1), 8)
  }, [sources])

  // Crossfilter: every view respects all filters except the one it controls.
  const passPeak = useCallback((s) => s.peak_brightness >= minPeak, [minPeak])
  const passBright = useCallback((s) => brightBin === null || inBin(s.peak_brightness, BRIGHTNESS_EDGES, brightBin), [brightBin])
  const passSize = useCallback((s) => sizeBin === null || inBin(s.approx_size_px, sizeEdges, sizeBin), [sizeBin, sizeEdges])
  const inFilter = useCallback((s) => passPeak(s) && passBright(s) && passSize(s), [passPeak, passBright, passSize])

  const filtered = sources.filter(inFilter)
  const brightCounts = binValues(sources.filter((s) => passPeak(s) && passSize(s)).map((s) => s.peak_brightness), BRIGHTNESS_EDGES)
  const sizeCounts = binValues(sources.filter((s) => passPeak(s) && passBright(s)).map((s) => s.approx_size_px), sizeEdges)
  const peaks = filtered.map((s) => s.peak_brightness)
  const sizes = filtered.map((s) => s.approx_size_px)
  const anyFilter = minPeak > 0 || brightBin !== null || sizeBin !== null

  function clearFilters() {
    setMinPeak(0)
    setBrightBin(null)
    setSizeBin(null)
  }

  return (
    <>
      <div className="dojo-filters" role="group" aria-label="Analysis filters">
        <label className="range-field">
          <span>
            Minimum peak brightness <span className="mono">{minPeak.toFixed(2)}</span>
          </span>
          <input type="range" min="0" max="1" step="0.05" value={minPeak} onChange={(e) => setMinPeak(Number(e.target.value))} />
        </label>
        <div className="chips">
          {brightBin !== null && (
            <button type="button" className="chip" aria-pressed="true" onClick={() => setBrightBin(null)}>
              Peak {binLabel(BRIGHTNESS_EDGES, brightBin, fmt1)} <X size={14} aria-label="remove filter" />
            </button>
          )}
          {sizeBin !== null && (
            <button type="button" className="chip" aria-pressed="true" onClick={() => setSizeBin(null)}>
              Size {binLabel(sizeEdges, sizeBin, fmt1, ' px')} <X size={14} aria-label="remove filter" />
            </button>
          )}
          {anyFilter && (
            <button type="button" className="button button-small button-ghost" onClick={clearFilters}>
              Clear filters
            </button>
          )}
        </div>
        <p className="fine-print dojo-count" role="status">
          Showing {filtered.length} of {sources.length} candidates from <strong>{analysis.fileName}</strong> · click a bar to filter
        </p>
      </div>

      <div className="stat-row">
        <MetricCard label="Candidates" value={filtered.length} />
        <MetricCard label="Median peak brightness" value={median(peaks)?.toFixed(2) ?? null} note="0–1 pixel value, uncalibrated" />
        <MetricCard label="Median size" value={median(sizes)?.toFixed(1) ?? null} unit="px" note="estimate" />
        <MetricCard label="Image" value={`${analysis.width}×${analysis.height}`} unit="px" />
        <MetricCard
          label="Restoration time"
          value={analysis.restore?.runtime_ms ?? null}
          unit="ms"
          note={analysis.restore ? analysis.restore.model_name : 'not run for this image'}
        />
      </div>

      <div className="dojo-grid">
        <Card title="Where the candidates are" icon={ChartScatter} badge={<StatusBadge dataKind={detect.data_kind} />} className="dojo-wide">
          <p className="fine-print">Pixel positions in the original image (origin top-left). Click a point or use the arrow keys to select it.</p>
          <ScatterPlot
            sources={sources}
            imageWidth={analysis.width}
            imageHeight={analysis.height}
            inFilter={inFilter}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
          <details className="chart-table">
            <summary>Show data table</summary>
            <DetectionTable sources={filtered} selectedId={selectedId} onSelect={setSelectedId} />
          </details>
        </Card>

        <Card title="Original vs restored" icon={ImageIcon} className="dojo-wide">
          {imagesMatch ? (
            <ImageViewer
              originalSrc={images.originalUrl}
              restoredSrc={images.restoredSrc}
              width={analysis.width}
              height={analysis.height}
              sources={filtered}
              selectedId={selectedId}
              onSelectSource={setSelectedId}
              focusRequest={null}
            />
          ) : (
            <EmptyState icon={ImageIcon} message="Images are kept only while the app is open, never stored. Run Spirit Lens again to compare them here.">
              <button type="button" className="button button-small" onClick={() => onNavigate('lens')}>
                Open Spirit Lens
              </button>
            </EmptyState>
          )}
        </Card>

        <Card title="Peak brightness distribution" icon={BarChart3}>
          <Histogram
            edges={BRIGHTNESS_EDGES}
            counts={brightCounts}
            format={fmt1}
            xLabel="Peak brightness (normalised pixel value, 0–1)"
            describeBin={(i) => `Peak ${binLabel(BRIGHTNESS_EDGES, i, fmt1)}`}
            selected={brightBin}
            onSelect={setBrightBin}
          />
          <BinTable edges={BRIGHTNESS_EDGES} counts={brightCounts} format={fmt1} caption="Candidates per peak-brightness range" />
        </Card>

        <Card title="Size distribution" icon={BarChart3}>
          <Histogram
            edges={sizeEdges}
            counts={sizeCounts}
            format={fmt1}
            xLabel="Approximate size (px, estimate)"
            describeBin={(i) => `Size ${binLabel(sizeEdges, i, fmt1, ' px')}`}
            selected={sizeBin}
            onSelect={setSizeBin}
          />
          <BinTable edges={sizeEdges} counts={sizeCounts} format={fmt1} unit=" px" caption="Candidates per size range" />
        </Card>
      </div>
      <p className="fine-print dojo-note">
        Values come from {detect.method} ({detect.data_kind}). They describe pixels in one photo: they are not calibrated
        brightness, physical size or confirmed objects.
      </p>
    </>
  )
}

function HistoryCard({ onNavigate }) {
  const activity = useActivity()
  return (
    <Card title="Observation history" icon={ScanEye}>
      {activity.length === 0 ? (
        <EmptyState message="No Spirit Lens runs in this browser yet.">
          <button type="button" className="button button-small" onClick={() => onNavigate('lens')}>
            Open Spirit Lens
          </button>
        </EmptyState>
      ) : (
        <ul className="item-list">
          {activity.slice(0, 6).map((a) => (
            <li key={a.at}>
              <div className="item-title">
                <strong className="activity-file">{a.fileName}</strong>
                <StatusBadge dataKind={a.dataKind} />
              </div>
              <p className="fine-print">
                {a.action === 'detect' ? `Detection · ${a.count} candidates` : `Restoration · ${a.width}×${a.height} px`} ·{' '}
                {new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(a.at))}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

function SavedLocationsCard({ onNavigate, onPlaceChange }) {
  const favorites = useFavorites()
  const locations = useApiGet(favorites.length ? '/api/locations' : null)
  const saved = (locations.data?.locations ?? []).filter((l) => favorites.includes(l.id))
  return (
    <Card title="Saved locations" icon={Heart}>
      {favorites.length === 0 ? (
        <EmptyState message="No favourite viewing spots yet. Save one from the Watchtower.">
          <button type="button" className="button button-small" onClick={() => onNavigate('watchtower')}>
            Open Watchtower
          </button>
        </EmptyState>
      ) : (
        <ul className="item-list">
          {saved.map((l) => (
            <li key={l.id}>
              <button
                type="button"
                className="link-button"
                onClick={() => {
                  onPlaceChange({ id: l.id, lat: l.lat, lon: l.lon, name: l.name })
                  onNavigate('watchtower')
                }}
              >
                {l.name}
              </button>
              <p className="mono fine-print">
                {l.lat}, {l.lon}
              </p>
            </li>
          ))}
          {locations.loading && <li className="fine-print">Loading...</li>}
        </ul>
      )}
    </Card>
  )
}

function UpcomingCard({ onNavigate }) {
  const now = useNow(60000)
  const saved = useSavedEvents()
  const reminders = useReminders()
  const remindIds = new Set(reminders.map((r) => r.eventId))
  const upcoming = saved.filter((e) => new Date(e.start_time) >= now).sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
  return (
    <Card title="Upcoming saved events" icon={Bookmark}>
      {upcoming.length === 0 ? (
        <EmptyState message="No upcoming saved events. Bookmark events in the Celestial Scroll.">
          <button type="button" className="button button-small" onClick={() => onNavigate('scroll')}>
            Open Celestial Scroll
          </button>
        </EmptyState>
      ) : (
        <ul className="item-list">
          {upcoming.slice(0, 6).map((e) => (
            <li key={e.id}>
              <div className="item-title">
                <strong>{e.title}</strong>
                {remindIds.has(e.id) && (
                  <span className="reminder-flag">
                    <Bell size={14} aria-hidden="true" /> Reminder
                  </span>
                )}
              </div>
              <p className="mono fine-print">{formatDateTime(e.start_time, e.timezone)}</p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

export default function Dojo({ onNavigate, onPlaceChange }) {
  const analysis = useAnalysis()
  return (
    <>
      {analysis?.detect ? (
        <AnalysisSection key={analysis.detect.at} analysis={analysis} onNavigate={onNavigate} />
      ) : (
        <Card title="Analysis" icon={BarChart3}>
          <EmptyState
            icon={BarChart3}
            message="Charts of brightness, size and position appear here after you run “Find candidate sources” in Spirit Lens."
          >
            <button type="button" className="button button-primary button-small" onClick={() => onNavigate('lens')}>
              Open Spirit Lens
            </button>
          </EmptyState>
        </Card>
      )}

      <div className="dojo-lists">
        <HistoryCard onNavigate={onNavigate} />
        <SavedLocationsCard onNavigate={onNavigate} onPlaceChange={onPlaceChange} />
        <UpcomingCard onNavigate={onNavigate} />
      </div>

      <Card title="Spectral analysis" icon={FlaskConical} className="dojo-spectral">
        <Unavailable
          what="Spectral analysis"
          reason="It needs real spectral data (for example a spectrograph or FITS spectrum). A photo’s RGB pixels are not a spectrum, so nothing is estimated here."
        />
      </Card>
    </>
  )
}
