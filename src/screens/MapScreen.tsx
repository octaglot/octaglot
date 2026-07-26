import { motion } from 'framer-motion';
import { useGame } from '../lib/store';
import { Mascot } from '../components/Mascot';
import { Crown, Lock, Play, Star } from '../components/Icons';
import type { Lesson, Unit } from '../lib/types';

/* Duolingo'nun patikası: üniteler dikey akar, dersler zigzag düğümlerdir.
   Bir ders ancak kendinden önceki bitince açılır. */

const UNIT_COLORS = [
  ['var(--green)', 'var(--green-dark)'],
  ['var(--blue)', 'var(--blue-dark)'],
  ['var(--purple)', '#a860d8'],
  ['var(--gold)', 'var(--gold-dark)'],
  ['var(--orange)', '#d97e00'],
  ['var(--red)', 'var(--red-dark)'],
];

/* Patika deseni ünite içindeki ders sırasına göre uygulanır (global sıraya
   göre değil) — böylece her ünite ortadan başlar ve simetrik salınır. */
const OFFSETS = [0, 72, 0, -72];

export function MapScreen({ onStart }: { onStart: (lesson: Lesson, unit: Unit) => void }) {
  const { units, lessons, done } = useGame();

  const ordered = lessons;
  const firstOpen = ordered.findIndex((l) => !done.has(l.id));
  const openIndex = firstOpen === -1 ? ordered.length : firstOpen;

  return (
    <div className="scroll" style={{ height: '100%', padding: '32px 0 120px' }}>
      {units.map((unit) => {
        const unitLessons = ordered.filter((l) => l.unit_id === unit.id);
        const [c, cd] = UNIT_COLORS[(unit.id - 1) % UNIT_COLORS.length];
        const unitDone = unitLessons.every((l) => done.has(l.id));

        return (
          <section key={unit.id} style={{ marginBottom: 48 }}>
            <header
              style={{
                background: c,
                boxShadow: `0 4px 0 ${cd}`,
                borderRadius: 'var(--r-lg)',
                padding: '16px 22px',
                color: 'var(--snow)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                maxWidth: 560,
                margin: '0 auto 36px',
              }}
            >
              <div>
                <div style={{ fontSize: 'var(--t-tiny)', opacity: 0.85, letterSpacing: 1, fontWeight: 800 }}>
                  {unit.cefr} · ÜNİTE {unit.id}
                </div>
                <h2 style={{ fontSize: 'var(--t-title)', marginTop: 2 }}>{unit.title}</h2>
                <div style={{ fontSize: 'var(--t-small)', opacity: 0.9 }}>{unit.subtitle}</div>
              </div>
              {unitDone && <Crown size={32} color="rgba(255,255,255,.95)" />}
            </header>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 30 }}>
              {unitLessons.map((lesson, li) => {
                const globalIdx = ordered.indexOf(lesson);
                const isDone = done.has(lesson.id);
                const isOpen = globalIdx === openIndex;
                const locked = globalIdx > openIndex;

                return (
                  <div
                    key={lesson.id}
                    style={{
                      transform: `translateX(${OFFSETS[li % OFFSETS.length]}px)`,
                      position: 'relative',
                      // İlk düğümün "BAŞLA" etiketi ünite başlığına girmesin.
                      marginTop: li === 0 ? 12 : 0,
                    }}
                  >
                    {isOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={{
                          position: 'absolute',
                          bottom: '100%',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          marginBottom: 10,
                          background: 'var(--snow)',
                          border: '2px solid var(--swan)',
                          borderRadius: 'var(--r-md)',
                          padding: '6px 14px',
                          fontWeight: 800,
                          fontSize: 'var(--t-tiny)',
                          color: c,
                          letterSpacing: 1,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        BAŞLA
                      </motion.div>
                    )}
                    <motion.button
                      whileHover={locked ? undefined : { scale: 1.06 }}
                      whileTap={locked ? undefined : { scale: 0.94, y: 4 }}
                      animate={isOpen ? { y: [0, -6, 0] } : {}}
                      transition={isOpen ? { duration: 1.8, repeat: Infinity, ease: 'easeInOut' } : {}}
                      disabled={locked}
                      onClick={() => onStart(lesson, unit)}
                      aria-label={`Ünite ${unit.id}, ders ${lesson.idx}`}
                      style={{
                        width: 76,
                        height: 68,
                        borderRadius: '50%',
                        border: 0,
                        background: locked ? 'var(--swan)' : isDone ? 'var(--gold)' : c,
                        boxShadow: `0 6px 0 ${locked ? '#cfcfcf' : isDone ? 'var(--gold-dark)' : cd}`,
                        color: locked ? 'var(--hare)' : 'var(--snow)',
                        display: 'grid',
                        placeItems: 'center',
                        cursor: locked ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {locked ? <Lock size={26} /> : isDone ? <Star size={30} /> : <Play size={26} />}
                    </motion.button>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      <div style={{ display: 'grid', placeItems: 'center', marginTop: 24 }}>
        <Mascot mood="idle" size={120} />
        <div style={{ color: 'var(--wolf)', fontWeight: 700, marginTop: 8 }}>
          {openIndex >= ordered.length ? 'Bütün dersleri bitirdin! 🎉' : 'Devam et, Pako seni bekliyor'}
        </div>
      </div>
    </div>
  );
}
