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
        d="M20 34.5 31.2 20.2a2.2 2.2 0 0 1 3.5 0L46 34.5a1.4 1.4 0 0 1-1.7 2.1l-9.6-4.2a2.2 2.2 0 0 0-1.8 0l-9.6 4.2a1.4 1.4 0 0 1-1.7-2.1Z"
        fill="var(--snow)"
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
