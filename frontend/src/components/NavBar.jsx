export default function NavBar({ sections, current, onSelect }) {
  return (
    <nav className="navbar" aria-label="Main sections">
      <ul>
        {sections.map((section) => (
          <li key={section.id}>
            <button
              type="button"
              className="nav-button"
              aria-current={section.id === current ? 'page' : undefined}
              onClick={() => onSelect(section.id)}
            >
              <span className="nav-kanji" aria-hidden="true">
                {section.kanji}
              </span>
              {section.label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}
