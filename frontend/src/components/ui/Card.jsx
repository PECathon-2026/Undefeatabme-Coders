import './ui.css'

// Panel used everywhere. `icon` is a Lucide component shown before the title.
export default function Card({ title, icon: Icon, badge, className = '', children, headingLevel = 2 }) {
  const Heading = `h${headingLevel}`
  return (
    <article className={`card ${className}`}>
      {(title || badge) && (
        <header className="card-header">
          {title && (
            <Heading className="card-title">
              {Icon && <Icon size={18} aria-hidden="true" />}
              {title}
            </Heading>
          )}
          {badge}
        </header>
      )}
      <div className="card-body">{children}</div>
    </article>
  )
}
