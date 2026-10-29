import { CircleAlert, RefreshCw } from 'lucide-react'
import './ui.css'

export default function ErrorBox({ error, onRetry }) {
  return (
    <div className="error-box" role="alert">
      <p>
        <CircleAlert size={18} aria-hidden="true" />
        {error?.message ?? 'Something went wrong.'}
      </p>
      {onRetry && (
        <button type="button" className="button button-small" onClick={onRetry}>
          <RefreshCw size={16} aria-hidden="true" />
          Retry
        </button>
      )}
    </div>
  )
}
