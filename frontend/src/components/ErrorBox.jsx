export default function ErrorBox({ error, onRetry }) {
  return (
    <div className="error-box" role="alert">
      <p>{error?.message ?? 'Something went wrong.'}</p>
      {onRetry && (
        <button type="button" className="button" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  )
}
