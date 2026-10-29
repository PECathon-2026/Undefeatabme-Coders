import { useId } from 'react'
import './astronomy.css'

// Pass `label` for a meaningful image; without it the moon is decorative (hidden from screen readers).
// Path of the sunlit part of the disc for a phase fraction (0 new, 0.5 full), northern-hemisphere view.
function litPath(fraction, r, cx, cy) {
  const k = Math.cos(2 * Math.PI * fraction)
  const rx = Math.abs(k) * r
  const waxing = fraction < 0.5
  const outerSweep = waxing ? 1 : 0
  const terminatorSweep = waxing ? (k > 0 ? 0 : 1) : k > 0 ? 1 : 0
  return `M ${cx} ${cy - r} A ${r} ${r} 0 0 ${outerSweep} ${cx} ${cy + r} A ${rx} ${r} 0 0 ${terminatorSweep} ${cx} ${cy - r} Z`
}

export default function MoonPhase({ fraction, size = 120, label, glow = true }) {
  const id = useId().replace(/:/g, '')
  const r = 46
  const path = litPath(fraction, r, 50, 50)
  return (
    <svg
      className={`moon-phase ${glow ? 'moon-glow' : ''}`}
      width={size}
      height={size}
      viewBox="0 0 100 100"
      {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true, focusable: 'false' })}
    >
      <defs>
        <radialGradient id={`lit-${id}`} cx="40%" cy="38%" r="70%">
          <stop offset="0%" stopColor="#fbf7ea" />
          <stop offset="70%" stopColor="#e6dfca" />
          <stop offset="100%" stopColor="#bdb59f" />
        </radialGradient>
        <clipPath id={`clip-${id}`}>
          <path d={path} />
        </clipPath>
        <filter id={`soft-${id}`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.6" />
        </filter>
      </defs>
      <circle cx="50" cy="50" r={r} className="moon-dark" />
      <path d={path} fill={`url(#lit-${id})`} />
      {/* Faint maria, only on the lit side */}
      <g clipPath={`url(#clip-${id})`}>
        <g className="moon-maria" filter={`url(#soft-${id})`}>
          <ellipse cx="40" cy="34" rx="11" ry="7" transform="rotate(-20 40 34)" />
          <ellipse cx="57" cy="31" rx="7" ry="5" />
          <ellipse cx="60" cy="52" rx="12" ry="9" transform="rotate(25 60 52)" />
          <ellipse cx="42" cy="61" rx="8" ry="5" transform="rotate(10 42 61)" />
          <ellipse cx="30" cy="47" rx="4" ry="6" />
        </g>
      </g>
    </svg>
  )
}
