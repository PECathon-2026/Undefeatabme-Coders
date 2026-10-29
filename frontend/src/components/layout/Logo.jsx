// Brand emblem: crescent moon inside a gold ring, above a torii gate.
export function Emblem({ size = 40 }) {
  return (
    <svg className="emblem" width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <circle cx="24" cy="20" r="17" fill="none" stroke="var(--gold)" strokeWidth="1" opacity="0.7" />
      <circle cx="24" cy="18" r="11" fill="var(--paper)" />
      <circle cx="29" cy="14.5" r="10" fill="var(--obsidian)" />
      {/* Torii: kasagi (top beam), nuki (tie beam), two pillars */}
      <path d="M8 33 Q24 29.5 40 33 L40 35 Q24 31.8 8 35 Z" fill="var(--vermilion)" />
      <rect x="12" y="37.5" width="24" height="1.8" fill="var(--vermilion)" />
      <rect x="14.5" y="34" width="2.4" height="12" fill="var(--vermilion)" />
      <rect x="31.1" y="34" width="2.4" height="12" fill="var(--vermilion)" />
    </svg>
  )
}

export function Wordmark({ compact = false }) {
  return (
    <span className={`wordmark ${compact ? 'wordmark-compact' : ''}`}>
      <span className="wordmark-name">Tsukuyomi</span>
      <span className="wordmark-sub">
        Watch <span lang="ja">月読</span>
      </span>
    </span>
  )
}
