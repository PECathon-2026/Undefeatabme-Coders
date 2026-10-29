import { RotateCcw, ScanSearch, SlidersHorizontal, Sparkles, Telescope } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import DetectionTable from '../components/lens/DetectionTable.jsx'
import DropZone from '../components/lens/DropZone.jsx'
import ImageViewer from '../components/lens/ImageViewer.jsx'
import PipelineSteps from '../components/lens/PipelineSteps.jsx'
import ProcessingReport from '../components/lens/ProcessingReport.jsx'
import Card from '../components/ui/Card.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import ErrorBox from '../components/ui/ErrorBox.jsx'
import Loading from '../components/ui/Loading.jsx'
import StatusBadge from '../components/ui/StatusBadge.jsx'
import Unavailable from '../components/ui/Unavailable.jsx'
import { useToast } from '../components/ui/toastContext.js'
import { useApiPost } from '../hooks/useApiPost.js'
import { recordActivity } from '../lib/activity.js'
import { setAnalysis } from '../lib/analysis.js'
import './lens.css'

// Limits from docs/api-contracts.md; the backend still has the final say.
const MAX_BYTES = 10 * 1024 * 1024
const MIN_SIDE = 32
const MAX_SIDE = 2048
const ALLOWED_TYPES = ['image/jpeg', 'image/png']
const ALLOWED_EXTENSIONS = /\.(jpe?g|png)$/i
const ACCEPT = '.jpg,.jpeg,.png,image/jpeg,image/png'

const NOTICE =
  'Candidates only. Restoration is algorithmic enhancement and can create artefacts. Not a scientific measurement.'

function formatBytes(bytes) {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(bytes / 1024)} KB`
}

function checkFile(file) {
  if (/\.webp$/i.test(file.name) || file.type === 'image/webp') {
    return 'WebP is not supported by the backend yet. Please use a JPEG or PNG.'
  }
  if (/\.fits?$/i.test(file.name)) {
    return 'FITS files need a scientific image pipeline that is not available yet. Please export a JPEG or PNG.'
  }
  if (!ALLOWED_TYPES.includes(file.type) || !ALLOWED_EXTENSIONS.test(file.name)) {
    return 'Please choose a JPEG or PNG image (.jpg, .jpeg or .png).'
  }
  if (file.size > MAX_BYTES) {
    return `This file is ${formatBytes(file.size)}. The limit is 10 MB, so please choose a smaller image.`
  }
  return null
}

function checkSize({ width, height }) {
  if (Math.max(width, height) > MAX_SIDE) return `This image is ${width}×${height} px. Each side must be at most ${MAX_SIDE} px.`
  if (Math.min(width, height) < MIN_SIDE) return `This image is ${width}×${height} px. Each side must be at least ${MIN_SIDE} px.`
  return null
}

function Warnings({ warnings }) {
  if (!warnings?.length) return null
  return (
    <div className="notice-bar" role="status">
      <ul>
        {warnings.map((w) => (
          <li key={w}>{w}</li>
        ))}
      </ul>
    </div>
  )
}

function Progress({ job, label }) {
  const uploading = job.uploaded < 1
  return (
    <div className="job-progress">
      <Loading label={`${uploading ? 'Uploading' : label}... ${(job.elapsedMs / 1000).toFixed(1)} s`} />
      <div
        className="progress-bar"
        role="progressbar"
        aria-label="Upload progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(job.uploaded * 100)}
      >
        <span style={{ width: `${Math.round(job.uploaded * 100)}%` }} />
      </div>
    </div>
  )
}

export default function SpiritLens() {
  const [upload, setUpload] = useState({ file: null, url: null, error: null })
  const [size, setSize] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const [focusRequest, setFocusRequest] = useState(null)
  const [minPeak, setMinPeak] = useState(0)
  const [exported, setExported] = useState(false)
  const urlRef = useRef(null)
  const restore = useApiPost()
  const detect = useApiPost()
  const toast = useToast()

  // Revoke the preview URL when leaving the page.
  useEffect(() => () => urlRef.current && URL.revokeObjectURL(urlRef.current), [])

  function reset() {
    restore.reset()
    detect.reset()
    setSize(null)
    setSelectedId(null)
    setMinPeak(0)
    setExported(false)
    if (urlRef.current) URL.revokeObjectURL(urlRef.current)
    urlRef.current = null
    setUpload({ file: null, url: null, error: null })
  }

  function handleFile(file) {
    reset()
    const problem = checkFile(file)
    if (problem) {
      setUpload({ file: null, url: null, error: problem })
      return
    }
    urlRef.current = URL.createObjectURL(file)
    setUpload({ file, url: urlRef.current, error: null })
  }

  function handlePreviewLoad(e) {
    setSize({ width: e.currentTarget.naturalWidth, height: e.currentTarget.naturalHeight })
  }

  function handlePreviewError() {
    setUpload((u) => ({ ...u, error: 'This file could not be read as an image. Please choose another JPEG or PNG.' }))
  }

  const sizeError = size ? checkSize(size) : null
  const fileError = upload.error ?? sizeError
  const ready = Boolean(upload.file && size && !fileError)

  async function restoreImage() {
    const data = await restore.run('/api/restore', upload.file)
    if (!data) return
    recordActivity({ action: 'restore', fileName: upload.file.name, width: data.width, height: data.height, dataKind: data.data_kind })
    setAnalysis((a) => ({
      ...(a?.fileName === upload.file.name ? a : { fileName: upload.file.name, width: data.width, height: data.height }),
      restore: { model_name: data.model_name, runtime_ms: data.runtime_ms, data_kind: data.data_kind, at: new Date().toISOString() },
    }))
    toast.show(`Restoration finished in ${data.runtime_ms} ms.`)
  }

  async function findSources() {
    const data = await detect.run('/api/detect-objects', upload.file)
    if (!data) return
    recordActivity({ action: 'detect', fileName: upload.file.name, count: data.count, dataKind: data.data_kind })
    setAnalysis((a) => ({
      ...(a?.fileName === upload.file.name ? a : { fileName: upload.file.name }),
      width: data.image_width,
      height: data.image_height,
      detect: { method: data.method, count: data.count, sources: data.sources, data_kind: data.data_kind, at: new Date().toISOString() },
    }))
    toast.show(`${data.count} candidate source${data.count === 1 ? '' : 's'} found.`)
  }

  const visibleSources = useMemo(
    () => detect.data?.sources.filter((s) => s.peak_brightness >= minPeak) ?? null,
    [detect.data, minPeak],
  )

  function selectSource(id, centre = false) {
    setSelectedId(id)
    if (centre) setFocusRequest({ id, at: Date.now() })
  }

  const done = new Set()
  if (upload.file && !fileError) done.add('upload')
  if (ready) done.add('inspect').add('settings')
  if (restore.data) done.add('restore').add('compare')
  if (detect.data) done.add('analyse')
  if (exported) done.add('export')

  return (
    <>
      <p className="science-notice" role="note">
        {NOTICE}
      </p>
      <PipelineSteps done={done} />

      <div className="lens-layout">
        <section className="lens-main" aria-label="Image workspace">
          {!upload.url ? (
            <DropZone
              onFile={handleFile}
              accept={ACCEPT}
              hint={`JPEG or PNG · up to 10 MB · ${MIN_SIDE}–${MAX_SIDE} px per side. WebP and FITS are not supported by the backend yet.`}
            />
          ) : (
            <>
              {/* Hidden probe image gives the natural size for validation and the viewer. */}
              <img src={upload.url} alt="" className="visually-hidden" onLoad={handlePreviewLoad} onError={handlePreviewError} />
              <Warnings warnings={restore.data?.warnings} />
              {size && (
                <ImageViewer
                  originalSrc={upload.url}
                  restoredSrc={restore.data?.restored_image ?? null}
                  width={size.width}
                  height={size.height}
                  sources={visibleSources}
                  selectedId={selectedId}
                  onSelectSource={(id) => selectSource(id)}
                  focusRequest={focusRequest}
                />
              )}
            </>
          )}
          {fileError && (
            <p className="inline-error" role="alert">
              {fileError}
            </p>
          )}
        </section>

        <aside className="lens-side" aria-label="Controls">
          <Card title="Your image" icon={Telescope}>
            {upload.file ? (
              <>
                <p className="lens-file">
                  <strong>{upload.file.name}</strong>
                  <span className="fine-print">
                    {formatBytes(upload.file.size)}
                    {size && ` · ${size.width}×${size.height} px`}
                  </span>
                </p>
                <div className="action-row">
                  <DropZone onFile={handleFile} accept={ACCEPT} compact />
                  <button type="button" className="button button-small button-ghost" onClick={reset}>
                    <RotateCcw size={16} aria-hidden="true" />
                    Reset
                  </button>
                </div>
              </>
            ) : (
              <p className="fine-print">No image yet. Your original stays in this browser; only a copy is sent for processing.</p>
            )}
            <div className="action-row">
              <button type="button" className="button button-primary" disabled={!ready || restore.loading} onClick={restoreImage}>
                <Sparkles size={18} aria-hidden="true" />
                Restore
              </button>
              <button type="button" className="button" disabled={!ready || detect.loading} onClick={findSources}>
                <ScanSearch size={18} aria-hidden="true" />
                Find candidate sources
              </button>
            </div>
            {restore.loading && <Progress job={restore} label="Restoring" />}
            {restore.error && <ErrorBox error={restore.error} onRetry={restoreImage} />}
            {detect.loading && <Progress job={detect} label="Searching for candidates" />}
            {detect.error && <ErrorBox error={detect.error} onRetry={findSources} />}
          </Card>

          <Card title="Processing settings" icon={SlidersHorizontal}>
            <p>
              The backend applies one fixed, conservative pipeline: noise reduction and gentle sharpening
              {restore.data ? (
                <>
                  {' '}
                  (<span className="mono">{restore.data.model_name}</span>, {restore.data.model_license})
                </>
              ) : null}
              . It never adds stars or detail.
            </p>
            <Unavailable what="Adjustable settings (noise, blur, contrast, background)" reason="The API accepts only the image for now." />
          </Card>

          {upload.file && (restore.data || detect.data) && (
            <ProcessingReport
              file={upload.file}
              size={size}
              restore={restore.data}
              detect={detect.data}
              onExported={() => setExported(true)}
            />
          )}
        </aside>
      </div>

      {detect.data && (
        <Card title="Candidate sources" icon={ScanSearch} badge={<StatusBadge dataKind={detect.data.data_kind} />} className="lens-results">
          <Warnings warnings={detect.data.warnings} />
          <div className="lens-filters">
            <div className="chips" role="group" aria-label="Object classes">
              <span className="chip chip-static">All candidates ({detect.data.count})</span>
              <button type="button" className="chip" disabled title="Classification needs backend support">
                Stars <span className="chip-note">needs backend</span>
              </button>
              <button type="button" className="chip" disabled title="Classification needs backend support">
                Galaxies <span className="chip-note">needs backend</span>
              </button>
            </div>
            <label className="range-field lens-peak">
              <span>
                Minimum peak brightness: <span className="mono">{minPeak.toFixed(2)}</span> · showing {visibleSources.length} of{' '}
                {detect.data.count}
              </span>
              <input type="range" min="0" max="1" step="0.05" value={minPeak} onChange={(e) => setMinPeak(Number(e.target.value))} />
            </label>
          </div>
          {detect.data.count === 0 ? (
            <EmptyState message="No candidate sources found in this image." />
          ) : visibleSources.length === 0 ? (
            <EmptyState message="No candidates at this brightness. Lower the minimum to see more." />
          ) : (
            <DetectionTable sources={visibleSources} selectedId={selectedId} onSelect={(id) => selectSource(id, true)} />
          )}
          <p className="fine-print">
            Method: <span className="mono">{detect.data.method}</span>. Object classes and confidence are not provided by the
            detector; nothing here identifies real stars or galaxies.
          </p>
        </Card>
      )}
    </>
  )
}
