import { motion, type TargetAndTransition } from 'framer-motion';

export type Mood = 'idle' | 'happy' | 'sad' | 'cheer' | 'think';

/* Pako — Cıvıl'ın maskotu, yeşil bir papağan.
   Tek bir SVG; ruh hali gövde animasyonunu, göz şeklini ve kaşları değiştirir. */

const bodyAnim: Record<Mood, TargetAndTransition> = {
  idle: { y: [0, -4, 0], rotate: 0, transition: { duration: 2.4, repeat: Infinity, ease: 'easeInOut' } },
  think: { rotate: [-3, 3, -3], y: 0, transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' } },
  happy: { y: [0, -14, 0], transition: { duration: 0.5, repeat: 2, ease: 'easeOut' } },
  cheer: { y: [0, -22, 0], rotate: [0, -8, 8, 0], transition: { duration: 0.8, repeat: Infinity, ease: 'easeInOut' } },
  sad: { y: 6, rotate: 0, transition: { duration: 0.3 } },
};

const wingAnim: Record<Mood, TargetAndTransition> = {
  idle: { rotate: [0, 6, 0], transition: { duration: 2.4, repeat: Infinity, ease: 'easeInOut' } },
  think: { rotate: 0 },
  happy: { rotate: [0, -40, 0], transition: { duration: 0.5, repeat: 2 } },
  cheer: { rotate: [-30, -55, -30], transition: { duration: 0.4, repeat: Infinity, ease: 'easeInOut' } },
  sad: { rotate: 24, transition: { duration: 0.3 } },
};

export function Mascot({ mood = 'idle', size = 140 }: { mood?: Mood; size?: number }) {
  const sad = mood === 'sad';
  const joy = mood === 'happy' || mood === 'cheer';

  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 160 160"
      fill="none"
      animate={bodyAnim[mood]}
      style={{ overflow: 'visible' }}
      aria-hidden="true"
    >
      {/* kuyruk */}
      <path d="M96 116c14 10 26 16 34 14-6-8-8-18-6-28-10 4-20 9-28 14Z" fill="#1cb0f6" />
      <path d="M100 122c12 8 22 12 28 11-5-6-6-13-5-20-8 3-16 6-23 9Z" fill="#89e219" />

      {/* gövde */}
      <ellipse cx="72" cy="88" rx="46" ry="48" fill="#58cc02" />
      <ellipse cx="72" cy="98" rx="30" ry="34" fill="#89e219" />

      {/* kanat */}
      <motion.path
        d="M32 74c-8 10-8 26 2 36 6 6 14 8 20 4-8-12-12-26-10-40-4-2-9-2-12 0Z"
        fill="#4fb800"
        animate={wingAnim[mood]}
        style={{ originX: '38px', originY: '76px' }}
      />

      {/* baş */}
      <circle cx="72" cy="52" r="38" fill="#58cc02" />
      <path d="M72 14a38 38 0 0 1 34 21c-10-6-22-9-34-9s-24 3-34 9a38 38 0 0 1 34-21Z" fill="#89e219" />

      {/* gözler */}
      <circle cx="58" cy="48" r="12" fill="#fff" />
      <circle cx="88" cy="48" r="12" fill="#fff" />
      {sad ? (
        <>
          <path d="M52 50a6 6 0 0 1 12 0" stroke="#4b4b4b" strokeWidth="5" strokeLinecap="round" fill="none" />
          <path d="M82 50a6 6 0 0 1 12 0" stroke="#4b4b4b" strokeWidth="5" strokeLinecap="round" fill="none" />
        </>
      ) : joy ? (
        <>
          <path d="M51 50c3-6 11-6 14 0" stroke="#4b4b4b" strokeWidth="5" strokeLinecap="round" fill="none" />
          <path d="M81 50c3-6 11-6 14 0" stroke="#4b4b4b" strokeWidth="5" strokeLinecap="round" fill="none" />
        </>
      ) : (
        <>
          <circle cx="59" cy="49" r="6" fill="#4b4b4b" />
          <circle cx="89" cy="49" r="6" fill="#4b4b4b" />
          <circle cx="61" cy="46" r="2" fill="#fff" />
          <circle cx="91" cy="46" r="2" fill="#fff" />
        </>
      )}

      {/* kaşlar */}
      {sad && (
        <>
          <path d="M48 32l16 6" stroke="#3a8a00" strokeWidth="5" strokeLinecap="round" />
          <path d="M98 32l-16 6" stroke="#3a8a00" strokeWidth="5" strokeLinecap="round" />
        </>
      )}

      {/* gaga */}
      <path d="M73 58c9 0 16 6 16 13s-7 13-16 13-16-6-16-13 7-13 16-13Z" fill="#ff9600" />
      <path d="M73 71c8 0 15 3 16 7-2 4-8 6-16 6s-14-2-16-6c1-4 8-7 16-7Z" fill="#e58200" />

      {/* ayaklar */}
      <path d="M58 132v8M86 132v8" stroke="#ff9600" strokeWidth="7" strokeLinecap="round" />
      <path d="M50 141h16M78 141h16" stroke="#ff9600" strokeWidth="7" strokeLinecap="round" />
    </motion.svg>
  );
}
