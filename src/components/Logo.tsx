/* Cıvıl logosu — soyut ve sade.
   Yeşil squircle bir konuşma balonu; içindeki beyaz açı hem bir kuş kanadı
   hem de yukarı yönlü ilerleme okunur. İki şekil, tek renk. */

export function Logo({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <path
        d="M14 4h36a10 10 0 0 1 10 10v26a10 10 0 0 1-10 10H30l-14 12a1.6 1.6 0 0 1-2.6-1.2V50h-1A10 10 0 0 1 4 40V14A10 10 0 0 1 14 4Z"
        fill="var(--green)"
      />
      <path
        d="M22 34.5 32 24l10 10.5"
        fill="none"
        stroke="var(--snow)"
        strokeWidth="6.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Wordmark({ size = 40 }: { size?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <Logo size={size} />
      <span
        style={{
          fontSize: size * 0.66,
          fontWeight: 900,
          color: 'var(--green)',
          letterSpacing: '-0.03em',
        }}
      >
        Cıvıl
      </span>
    </div>
  );
}
