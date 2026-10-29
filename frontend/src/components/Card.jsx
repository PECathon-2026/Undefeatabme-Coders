export default function Card({ title, badge, children }) {
  return (
    <article className="card">
      {(title || badge) && (
        <header className="card-header">
          {title && <h3>{title}</h3>}
          {badge}
        </header>
      )}
      <div className="card-body">{children}</div>
    </article>
  )
}
