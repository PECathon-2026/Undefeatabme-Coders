import './ui.css'

// Explains why there is nothing to show and, optionally, what to do about it.
export default function EmptyState({ message, icon: Icon, children }) {
  return (
    <div className="empty-state">
      {Icon && <Icon size={28} aria-hidden="true" />}
      <p>{message}</p>
      {children}
    </div>
  )
}
