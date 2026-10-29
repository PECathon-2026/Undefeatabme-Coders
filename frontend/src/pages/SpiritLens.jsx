import { useEffect, useRef, useState } from 'react'
import Card from '../components/ui/Card.jsx'
import CompareSlider from '../components/image/CompareSlider.jsx'
import DetectionOverlay from '../components/image/DetectionOverlay.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import ErrorBox from '../components/ui/ErrorBox.jsx'
import Loading from '../components/ui/Loading.jsx'
import StatusBadge from '../components/ui/StatusBadge.jsx'
import { useToast } from '../components/ui/toastContext.js'
import { useApiPost } from '../hooks/useApiPost.js'
import { recordActivity } from '../lib/activity.js'
import './lens.css'

// Limits from docs/api-contracts.md; the backend still has the final say.
const MAX_BYTES = 10 * 1024 * 1024
const MIN_SIDE = 32
const MAX_SIDE = 2048
const ALLOWED_TYPES = ['image/jpeg', 'image/png']
const ALLOWED_EXTENSIONS = /\.(jpe?g|png)$/i

const NOTICE =
  'Candidates only. Restoration is algorithmic enhancement and can create artefacts. Not a scientific measurement.'

function formatBytes(bytes) {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(bytes / 1024)} KB`
}

function checkFile(file) {
  if (!ALLOWED_TYPES.includes(file.type) || !ALLOWED_EXTENSIONS.test(file.name)) {
    return 'Please choose a JPEG or PNG image (.jpg, .jpeg or .png). FITS and other formats are not supported yet.'
  }
  if (file.size > MAX_BYTES) {
    return `This file is ${formatBytes(file.size)}. The limit is 10 MB, so please choose a smaller image.`
  }
  return null
}

function checkSize({ width, height }) {
  if (Math.max(width, height) > MAX_SIDE) {
    return `This image is ${width}×${height} px. Each side must be at most ${MAX_SIDE} px.`
  }
  if (Math.min(width, height) < MIN_SIDE) {
    return `This image is ${width}×${height} px. Each side must be at least ${MIN_SIDE} px.`
  }
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

function elapsed(ms) {
  return `${(ms / 1000).toFixed(1)} s`
}

export default function SpiritLens() {
  const [upload, setUpload] = useState({ file: null, url: null, error: null })
  const [size, setSize] = useState(null)
  const urlRef = useRef(null)
  const restore = useApiPost()
  const detect = useApiPost()
  const toast = useToast()

  // Revoke the preview URL when leaving the section.
  useEffect(() => () => urlRef.current && URL.revokeObjectURL(urlRef.current), [])

  function handleFile(e) {
    const file = e.target.files?.[0] ?? null
    restore.reset()
    detect.reset()
    setSize(null)
    if (urlRef.current) URL.revokeObjectURL(urlRef.current)
    urlRef.current = null

    if (!file) {
      setUpload({ file: null, url: null, error: null })
      return
    }
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
    toast.show(`Restoration finished in ${data.runtime_ms} ms.`)
  }

  async function findSources() {
    const data = await detect.run('/api/detect-objects', upload.file)
    if (!data) return
    recordActivity({ action: 'detect', fileName: upload.file.name, count: data.count, dataKind: data.data_kind })
    toast.show(`${data.count} candidate source${data.count === 1 ? '' : 's'} found.`)
  }

  return (
    <>

      <p className="science-notice" role="note">
        {NOTICE}
      </p>

      <Card title="Your image">
        <label className="file-field">
          <span>Choose a JPEG or PNG (max 10 MB, {MIN_SIDE}–{MAX_SIDE} px per side)</span>
          <input type="file" accept=".jpg,.jpeg,.png,image/jpeg,image/png" onChange={handleFile} />
        </label>
        {fileError && (
          <p className="inline-error" role="alert">
            {fileError}
          </p>
        )}
        {upload.url && (
          <div className="preview">
            <img
              src={upload.url}
              alt="Preview of the selected image"
              onLoad={handlePreviewLoad}
              onError={handlePreviewError}
            />
            <p className="fine-print">
              {upload.file.name} · {formatBytes(upload.file.size)}
              {size && ` · ${size.width}×${size.height} px`}
            </p>
          </div>
        )}
        <div className="action-row">
          <button type="button" className="button" disabled={!ready || restore.loading} onClick={restoreImage}>
            Restore
          </button>
          <button type="button" className="button" disabled={!ready || detect.loading} onClick={findSources}>
            Find candidate sources
          </button>
        </div>
      </Card>

      <div className="lens-results">
        {(restore.loading || restore.error || restore.data) && (
          <Card title="Restoration" badge={restore.data && <StatusBadge dataKind={restore.data.data_kind} />}>
            {restore.loading && <Loading label={`Restoring... ${elapsed(restore.elapsedMs)}`} />}
            {restore.error && <ErrorBox error={restore.error} onRetry={restoreImage} />}
            {restore.data && (
              <>
                <Warnings warnings={restore.data.warnings} />
                <CompareSlider
                  beforeSrc={upload.url}
                  afterSrc={restore.data.restored_image}
                  width={restore.data.width}
                  height={restore.data.height}
                />
                <p className="fine-print">
                  {restore.data.model_name} ({restore.data.model_license}) · {restore.data.width}×
                  {restore.data.height} px · {restore.data.runtime_ms} ms
                </p>
              </>
            )}
          </Card>
        )}

        {(detect.loading || detect.error || detect.data) && (
          <Card title="Candidate sources" badge={detect.data && <StatusBadge dataKind={detect.data.data_kind} />}>
            {detect.loading && <Loading label={`Searching for candidates... ${elapsed(detect.elapsedMs)}`} />}
            {detect.error && <ErrorBox error={detect.error} onRetry={findSources} />}
            {detect.data && (
              <>
                <Warnings warnings={detect.data.warnings} />
                <DetectionOverlay src={upload.url} result={detect.data} />
                {detect.data.count === 0 ? (
                  <EmptyState message="No candidate sources found in this image." />
                ) : (
                  <div className="table-scroll">
                    <table className="data-table">
                      <caption>
                        {detect.data.count} candidate{detect.data.count === 1 ? '' : 's'} ({detect.data.method}),
                        pixel coordinates from the top-left
                      </caption>
                      <thead>
                        <tr>
                          <th scope="col">id</th>
                          <th scope="col">x</th>
                          <th scope="col">y</th>
                          <th scope="col">peak_brightness</th>
                          <th scope="col">approx_size_px</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detect.data.sources.map((s) => (
                          <tr key={s.id}>
                            <td>{s.id}</td>
                            <td>{s.x.toFixed(1)}</td>
                            <td>{s.y.toFixed(1)}</td>
                            <td>{s.peak_brightness.toFixed(2)}</td>
                            <td>{s.approx_size_px.toFixed(1)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </Card>
        )}
      </div>
    </>
  )
}
