/* The Octaglot mark - two interlocking rings.
   Two languages locked together: the whole app is built on pairing Turkish
   with English. The rings are also the two "O"s of the name and speak the same
   round language as the mascot's suckers; being a closed loop, they stand for
   spaced repetition.

   The geometry sits on a 60-unit grid: outer radius 60, inner radius 30, the
   two centers 60 units apart. The quarter of each ring that meets the other is
   left empty, so the two shapes interlock without overlapping. The stroke is
   uniform, so the mark does not fill in at 16 pixels. */

const RING_LEFT = 'M120,60 A60,60 0 1 1 60,0 L60,30 A30,30 0 1 0 90,60 Z';
const RING_RIGHT = 'M60,60 A60,60 0 1 1 120,120 L120,90 A30,30 0 1 0 90,60 Z';

/** The bare mark - no background, 3:2 aspect ratio. */
export function Mark({ width = 60, color }: { width?: number; color?: string }) {
  return (
    <svg
      width={width}
      height={(width * 2) / 3}
      viewBox="0 0 180 120"
      fill="none"
      aria-hidden="true"
    >
      <path d={RING_LEFT} fill={color ?? 'var(--brand)'} />
      <path d={RING_RIGHT} fill={color ?? 'var(--brand)'} />
    </svg>
  );
}

/* The tile's gradient and corner radius match the app icon exactly; the icon
   is generated from the same values in `public/brand/icon.svg`. The corner
   radius is 22.5% of the edge - the ratio from Apple's macOS icon grid. */
/* The corner radius and mark ratio were measured from the icons of installed
   macOS apps - Safari, Mail, Notes and Photos all use the same value. The same
   numbers are used when generating public/brand/icon.svg. */
const TILE_RADIUS = 0.238;
const MARK_RATIO = 0.74;
const GRAD_TOP = '#a843d2';
const GRAD_BOTTOM = '#4c087b';
const GRAD_ID = 'octaglot-tile-gradient';

/** Square tile - the exact composition of the app icon. */
export function Logo({ size = 40 }: { size?: number }) {
  const r = size * TILE_RADIUS;
  const s = (size * MARK_RATIO) / 180;
  const tx = (size - 180 * s) / 2;
  const ty = (size - 120 * s) / 2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <defs>
        <linearGradient id={GRAD_ID} x1="0" y1="0" x2="0.35" y2="1">
          <stop offset="0" stopColor={GRAD_TOP} />
          <stop offset="1" stopColor={GRAD_BOTTOM} />
        </linearGradient>
      </defs>
      <rect width={size} height={size} rx={r} ry={r} fill={`url(#${GRAD_ID})`} />
      <g transform={`translate(${tx},${ty}) scale(${s})`}>
        <path d={RING_LEFT} fill="#ffffff" />
        <path d={RING_RIGHT} fill="#ffffff" />
      </g>
    </svg>
  );
}

export function Wordmark({ size = 40, color }: { size?: number; color?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: size * 0.28 }}>
      <Logo size={size} />
      <span
        style={{
          fontSize: size * 0.66,
          fontWeight: 900,
          color: color ?? 'var(--ink)',
          letterSpacing: '-0.03em',
        }}
      >
        Octaglot
      </span>
    </div>
  );
}
