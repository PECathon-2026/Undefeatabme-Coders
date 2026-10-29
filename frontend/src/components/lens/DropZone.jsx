import { Upload } from 'lucide-react'
import { useState } from 'react'
import './lens.css'

// Large drag-and-drop target that is also a normal, keyboard-accessible file picker.
export default function DropZone({ onFile, accept, hint, compact = false }) {
  const [over, setOver] = useState(false)

  function onDrop(e) {
    e.preventDefault()
    setOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) onFile(file)
  }

  return (
    <label
      className={`dropzone ${over ? 'is-over' : ''} ${compact ? 'is-compact' : ''}`}
      onDragOver={(e) => {
        e.preventDefault()
        setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
    >
      <input
        type="file"
        accept={accept}
        className="visually-hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          e.target.value = '' // allow choosing the same file again
          if (file) onFile(file)
        }}
      />
      <Upload size={compact ? 20 : 36} aria-hidden="true" />
      <span className="dropzone-title">{compact ? 'Replace image' : 'Drop a night-sky image here, or click to choose'}</span>
      {!compact && <span className="fine-print">{hint}</span>}
    </label>
  )
}
