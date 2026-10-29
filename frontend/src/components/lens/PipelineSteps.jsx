import { Check } from 'lucide-react'
import './lens.css'

// Progress through the Spirit Lens workflow. `done` = set of finished step ids.
const STEPS = [
  { id: 'upload', label: 'Upload' },
  { id: 'inspect', label: 'Inspect' },
  { id: 'settings', label: 'Settings' },
  { id: 'restore', label: 'Restore' },
  { id: 'compare', label: 'Compare' },
  { id: 'analyse', label: 'Analyse' },
  { id: 'export', label: 'Export' },
]

export default function PipelineSteps({ done }) {
  const current = STEPS.find((s) => !done.has(s.id))?.id
  return (
    <ol className="pipeline" aria-label="Processing steps">
      {STEPS.map((s, i) => {
        const state = done.has(s.id) ? 'done' : s.id === current ? 'current' : 'todo'
        return (
          <li key={s.id} className={`pipeline-step is-${state}`} aria-current={state === 'current' ? 'step' : undefined}>
            <span className="pipeline-dot" aria-hidden="true">
              {state === 'done' ? <Check size={14} /> : i + 1}
            </span>
            <span className="pipeline-label">
              {s.label}
              <span className="visually-hidden">{state === 'done' ? ' (done)' : state === 'current' ? ' (next)' : ''}</span>
            </span>
          </li>
        )
      })}
    </ol>
  )
}
