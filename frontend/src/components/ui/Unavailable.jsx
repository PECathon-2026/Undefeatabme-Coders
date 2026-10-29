import { Info } from 'lucide-react'
import './ui.css'

// For features the backend API does not provide yet. Says so plainly instead of faking data.
export default function Unavailable({ what, reason = 'Needs backend support: not in the API contract yet.' }) {
  return (
    <p className="unavailable">
      <Info size={16} aria-hidden="true" />
      <span>
        <strong>{what}</strong> unavailable. {reason}
      </span>
    </p>
  )
}
