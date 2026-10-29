// Decorative crescent moon with a faint halo, used in the header.
export default function MoonMotif({ size = 56 }) {
  return (
    <svg
      className="moon-motif"
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="32" cy="32" r="30" fill="none" stroke="var(--gold)" strokeWidth="1" opacity="0.35" />
      <circle cx="32" cy="32" r="22" fill="var(--paper)" />
      <circle cx="41" cy="26" r="20" fill="var(--ink)" />
      <circle cx="18" cy="40" r="2" fill="var(--red)" />
    </svg>
  )
}
