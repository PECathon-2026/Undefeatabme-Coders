export default function Loading({ label = 'Loading...' }) {
  return (
    <p className="loading" role="status">
      <span className="loading-moon" aria-hidden="true" />
      {label}
    </p>
  )
}
