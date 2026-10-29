import { memo } from 'react'
import './atmosphere.css'

// Deterministic pseudo-random numbers so the star field is identical on every load.
function seeded(seed) {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

const rand = seeded(20261030)
const STARS = Array.from({ length: 110 }, (_, i) => ({
  x: rand() * 1440,
  y: rand() * 560,
  r: rand() < 0.85 ? 0.6 + rand() * 0.6 : 1.3 + rand() * 0.7,
  twinkle: i % 7 === 0,
  delay: (rand() * 6).toFixed(2),
}))

// Two faint constellation sketches (decorative, not real star positions).
const CONSTELLATIONS = [
  [
    [1040, 120],
    [1092, 150],
    [1150, 138],
    [1196, 176],
    [1170, 226],
  ],
  [
    [210, 90],
    [262, 128],
    [318, 112],
    [352, 160],
  ],
]

// Fixed background: night gradient, grain, stars, constellations, ink-wash mountains, mist, distant torii.
function Atmosphere({ page, enabled }) {
  return (
    <div className={`atmosphere atmosphere-${page} ${enabled ? '' : 'atmosphere-off'}`} aria-hidden="true">
      <div className="atmo-gradient" />
      {enabled && (
        <svg className="atmo-sky" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMax slice">
          <defs>
            <linearGradient id="ridge-far" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1b2138" />
              <stop offset="100%" stopColor="#0b0e19" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="ridge-mid" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#141829" />
              <stop offset="100%" stopColor="#07080d" />
            </linearGradient>
            <linearGradient id="ridge-near" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0d0f19" />
              <stop offset="100%" stopColor="#050609" />
            </linearGradient>
            <linearGradient id="mist" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#c8ccd8" stopOpacity="0" />
              <stop offset="55%" stopColor="#c8ccd8" stopOpacity="0.07" />
              <stop offset="100%" stopColor="#c8ccd8" stopOpacity="0" />
            </linearGradient>
            <filter id="grain">
              <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
              <feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.05 0" />
            </filter>
          </defs>

          <g className="atmo-stars">
            {STARS.map((s, i) => (
              <circle
                key={i}
                cx={s.x}
                cy={s.y}
                r={s.r}
                className={s.twinkle ? 'star twinkle' : 'star'}
                style={s.twinkle ? { animationDelay: `${s.delay}s` } : undefined}
              />
            ))}
          </g>
          <g className="atmo-constellations">
            {CONSTELLATIONS.map((pts, i) => (
              <g key={i}>
                <polyline points={pts.map((p) => p.join(',')).join(' ')} />
                {pts.map(([x, y]) => (
                  <circle key={`${x}-${y}`} cx={x} cy={y} r="1.8" />
                ))}
              </g>
            ))}
          </g>

          <g className="atmo-mountains">
            <path
              fill="url(#ridge-far)"
              d="M0 640 L120 590 L230 620 L360 540 L470 600 L560 560 L700 610 L820 520 L930 585 L1060 545 L1180 600 L1300 560 L1440 610 L1440 900 L0 900 Z"
            />
            {/* Distant torii on the far ridge */}
            <g className="atmo-torii" transform="translate(806 488) scale(0.9)">
              <path d="M0 10 Q28 2 56 10 L56 14 Q28 7 0 14 Z" />
              <rect x="6" y="20" width="44" height="3" />
              <rect x="10" y="12" width="4" height="34" />
              <rect x="42" y="12" width="4" height="34" />
            </g>
            <rect className="atmo-mist" x="0" y="560" width="1440" height="160" fill="url(#mist)" />
            <path
              fill="url(#ridge-mid)"
              d="M0 720 L140 650 L260 700 L400 630 L520 690 L640 660 L780 720 L900 650 L1040 705 L1180 640 L1300 690 L1440 660 L1440 900 L0 900 Z"
            />
            <path
              fill="url(#ridge-near)"
              d="M0 800 L180 740 L330 790 L470 750 L640 810 L820 760 L990 815 L1150 770 L1300 805 L1440 780 L1440 900 L0 900 Z"
            />
          </g>
          <rect width="1440" height="900" filter="url(#grain)" className="atmo-grain" />
        </svg>
      )}
    </div>
  )
}

export default memo(Atmosphere)
