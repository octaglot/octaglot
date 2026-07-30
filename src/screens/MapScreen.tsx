import { useState } from 'react';
import { motion } from 'framer-motion';
import { useGame } from '../lib/store';
import { Mascot } from '../components/Mascot';
import { Crown, Lock, Play, Star } from '../components/Icons';
import type { Lesson, Unit } from '../lib/types';

/* Duolingo'nun patikası: üniteler dikey akar, dersler zigzag düğümlerdir.
   Bir ders ancak kendinden önceki bitince açılır. */

/* Bitmiş ders iki şey yapabilir: tekrar oynanır ya da efsaneye girilir. Seçim
   düğümün altında küçük bir balonda açılıyor — bu kadar küçük bir karar için
   ayrı ekran fazla. */
function DoneMenu({
  passed,
  onRetry,
  onLegendary,
}: {
  passed: boolean;
  onRetry: () => void;
  onLegendary: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        position: 'absolute',
        top: '100%',
        left: '50%',
        transform: 'translateX(-50%)',
        marginTop: 10,
        display: 'grid',
        gap: 6,
        background: 'var(--surface)',
        border: '2px solid var(--line)',
        borderRadius: 'var(--r-md)',
        padding: 8,
        boxShadow: 'var(--shadow-pop)',
        whiteSpace: 'nowrap',
      }}
    >
      <button className="btn btn--ghost" style={{ padding: '6px 14px', fontSize: 'var(--t-tiny)' }} onClick={onRetry}>
        Tekrar oyna
      </button>
      <button className="btn btn--ghost" style={{ padding: '6px 14px', fontSize: 'var(--t-tiny)' }} onClick={onLegendary}>
        {passed ? 'Efsane · geçildi' : 'Efsane'}
      </button>
    </motion.div>
  );
}

const UNIT_COLORS = [
  ['var(--deep-brand)', 'var(--brand-dark)'],
  ['var(--deep-ocean)', '#065a78'],
  ['var(--deep-lilac)', '#9f3fd6'],
  ['var(--deep-amber)', '#6d4500'],
  ['var(--deep-coral)', '#8f2b16'],
  ['var(--deep-rose)', '#94062a'],
];

/* Patika deseni ünite içindeki ders sırasına göre uygulanır (global sıraya
   göre değil) — böylece her ünite ortadan başlar ve simetrik salınır. */
const OFFSETS = [0, 72, 0, -72];

/* Patika geometrisi düğüm ölçüleriyle birebir aynı olmak zorunda — düğüm
   yüksekliği, aralık ve üst boşluk tek yerden gelsin. */
const NODE_H = 68;
const GAP = 30;
const TOP_PAD = 12;
const PATH_W = 240; // en geniş salınım (72*2) + düğüm genişliği kadar

/* Düğümler bağlantısız durunca harita dağınık okunuyordu. Bu şerit ardışık
   dersleri birleştiriyor: geçilen bölüm ünitenin renginde, kilitli bölüm soluk.
   Kalınlık ve yuvarlak uçlar logodaki halkalarla aynı çizgi dilinden. */
function LessonPath({ count, doneUpTo, color }: { count: number; doneUpTo: number; color: string }) {
  if (count < 2) return null;
  const cy = (i: number) => TOP_PAD + i * (NODE_H + GAP) + NODE_H / 2;
  const cx = (i: number) => PATH_W / 2 + OFFSETS[i % OFFSETS.length];
  const height = TOP_PAD + count * NODE_H + (count - 1) * GAP;

  return (
    <svg
      width={PATH_W}
      height={height}
      viewBox={`0 0 ${PATH_W} ${height}`}
      style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', pointerEvents: 'none' }}
      aria-hidden="true"
    >
      {Array.from({ length: count - 1 }, (_, i) => {
        const x1 = cx(i);
        const y1 = cy(i);
        const x2 = cx(i + 1);
        const y2 = cy(i + 1);
        const bend = (y2 - y1) / 2;
        // i. ders bittiyse ondan çıkan şerit de "geçilmiş" sayılır
        const travelled = i < doneUpTo;
        return (
          <path
            key={i}
            d={`M${x1},${y1} C${x1},${y1 + bend} ${x2},${y2 - bend} ${x2},${y2}`}
            fill="none"
            stroke={travelled ? color : 'var(--line)'}
            strokeOpacity={travelled ? 0.45 : 1}
            strokeWidth="10"
            strokeLinecap="round"
          />
        );
      })}
    </svg>
  );
}

export function MapScreen({
  onStart,
  onLegendary,
}: {
  onStart: (lesson: Lesson, unit: Unit) => void;
  onLegendary: (lesson: Lesson, unit: Unit) => void;
}) {
  const { units, lessons, done, legendary } = useGame();
  /* Bitmiş düğüme basınca hangi düğümün menüsünün açık olduğu. */
  const [menuFor, setMenuFor] = useState<number | null>(null);

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
                color: 'var(--on-color)',
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
                <div style={{ fontSize: 'var(--t-small)', opacity: 0.95 }}>{unit.subtitle}</div>
              </div>
              {unitDone && <Crown size={32} color="var(--on-color)" />}
            </header>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: GAP,
                position: 'relative',
                // İlk düğümün "BAŞLA" etiketi ünite başlığına girmesin.
                paddingTop: TOP_PAD,
              }}
            >
              <LessonPath count={unitLessons.length} doneUpTo={unitLessons.filter((l) => done.has(l.id)).length} color={c} />
              {unitLessons.map((lesson, li) => {
                const globalIdx = ordered.indexOf(lesson);
                const isDone = done.has(lesson.id);
                const isOpen = globalIdx === openIndex;
                const locked = globalIdx > openIndex;
                const isLegendary = legendary.has(lesson.id);

                return (
                  <div
                    key={lesson.id}
                    style={{
                      transform: `translateX(${OFFSETS[li % OFFSETS.length]}px)`,
                      position: 'relative',
                      /* Menü açık olan düğüm, kapatma katmanının (z 2) üstünde
                         kalmalı; yoksa menüye basılamıyor. */
                      zIndex: menuFor === lesson.id ? 3 : 1,
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
                          background: 'var(--surface)',
                          border: '2px solid var(--line)',
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
                      /* Bitmiş ders iki şey yapabilir; hangisi olduğunu düğüm
                         soruyor. Bitmemişse doğrudan başlar. */
                      onClick={() =>
                        isDone ? setMenuFor(menuFor === lesson.id ? null : lesson.id) : onStart(lesson, unit)
                      }
                      aria-label={`Ünite ${unit.id}, ders ${lesson.idx}`}
                      style={{
                        width: 76,
                        height: 68,
                        borderRadius: '50%',
                        border: 0,
                        background: locked ? 'var(--line)' : isDone ? 'var(--gold)' : c,
                        /* Efsane halkası düğümden boşlukla ayrılıyor: bitmiş
                           düğümün zemini zaten altın, ona bitişik altın bir
                           kenarlık görünmez kalıyordu. */
                        boxShadow: isLegendary
                          ? `0 6px 0 var(--gold-dark), 0 0 0 4px var(--surface), 0 0 0 7px var(--gold-dark)`
                          : `0 6px 0 ${locked ? 'var(--muted)' : isDone ? 'var(--gold-dark)' : cd}`,
                        color: locked ? 'var(--muted)' : 'var(--on-color)',
                        display: 'grid',
                        placeItems: 'center',
                        cursor: locked ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {locked ? (
                        <Lock size={26} />
                      ) : isLegendary ? (
                        <Crown size={30} />
                      ) : isDone ? (
                        <Star size={30} />
                      ) : (
                        <Play size={26} />
                      )}
                    </motion.button>

                    {menuFor === lesson.id && (
                      <DoneMenu
                        passed={isLegendary}
                        onRetry={() => {
                          setMenuFor(null);
                          onStart(lesson, unit);
                        }}
                        onLegendary={() => {
                          setMenuFor(null);
                          onLegendary(lesson, unit);
                        }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      {/* Menü açıkken boş bir yere basınca kapansın. */}
      {menuFor !== null && (
        <div
          onClick={() => setMenuFor(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 2 }}
          aria-hidden="true"
        />
      )}

      <div style={{ display: 'grid', placeItems: 'center', marginTop: 24 }}>
        <Mascot mood="idle" size={120} />
        <div style={{ color: 'var(--ink-2)', fontWeight: 700, marginTop: 8 }}>
          {openIndex >= ordered.length ? 'Bütün dersleri bitirdin! 🎉' : 'Devam et, Okta seni bekliyor'}
        </div>
      </div>
    </div>
  );
}
