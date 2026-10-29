import { Download, FileJson } from 'lucide-react'
import Card from '../ui/Card.jsx'
import { useToast } from '../ui/toastContext.js'
import './lens.css'

function formatBytes(bytes) {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(bytes / 1024)} KB`
}

function baseName(name) {
  return name.replace(/\.[^.]+$/, '')
}

function download(href, filename) {
  const a = document.createElement('a')
  a.href = href
  a.download = filename
  document.body.append(a)
  a.click()
  a.remove()
}

// Summary of what was done to the image, with downloads. The original file is never modified.
export default function ProcessingReport({ file, size, restore, detect, onExported }) {
  const toast = useToast()
  const buildReport = () => ({
    input: { filename: file.name, bytes: file.size, type: file.type, width: size?.width ?? null, height: size?.height ?? null },
    restoration: restore
      ? {
          status: 'completed',
          method: restore.model_name,
          license: restore.model_license,
          parameters: 'fixed backend pipeline (no user-adjustable parameters)',
          runtime_ms: restore.runtime_ms,
          data_kind: restore.data_kind,
          warnings: restore.warnings,
        }
      : { status: 'not run' },
    detection: detect
      ? { status: 'completed', method: detect.method, candidate_count: detect.count, data_kind: detect.data_kind, warnings: detect.warnings }
      : { status: 'not run' },
    note: 'Restoration is algorithmic enhancement and can create artefacts. Detections are candidates, not confirmed objects.',
    generated_at: new Date().toISOString(),
  })

  function downloadImage() {
    download(restore.restored_image, `${baseName(file.name)}-restored.png`)
    toast.show('Restored image downloaded. Your original file is unchanged.')
    onExported()
  }

  function downloadReport() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(buildReport(), null, 2)], { type: 'application/json' }))
    download(url, `${baseName(file.name)}-report.json`)
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    toast.show('Processing report downloaded.')
    onExported()
  }

  return (
    <Card title="Processing report" icon={FileJson}>
      <dl className="facts report-facts">
        <dt>Input</dt>
        <dd>{file.name}</dd>
        <dt>File</dt>
        <dd>
          {formatBytes(file.size)}
          {size ? ` · ${size.width}×${size.height} px` : ''}
        </dd>
        <dt>Restoration</dt>
        <dd>{restore ? `${restore.model_name} · ${restore.runtime_ms} ms` : 'not run'}</dd>
        <dt>Parameters</dt>
        <dd>fixed backend pipeline</dd>
        <dt>Detection</dt>
        <dd>{detect ? `${detect.count} candidates · ${detect.method}` : 'not run'}</dd>
      </dl>
      <div className="action-row">
        <button type="button" className="button button-small" onClick={downloadImage} disabled={!restore}>
          <Download size={16} aria-hidden="true" />
          Restored PNG
        </button>
        <button type="button" className="button button-small" onClick={downloadReport} disabled={!restore && !detect}>
          <FileJson size={16} aria-hidden="true" />
          Report (JSON)
        </button>
      </div>
      <p className="fine-print">Downloads are new files; your original image is never modified or uploaded anywhere else.</p>
    </Card>
  )
}
