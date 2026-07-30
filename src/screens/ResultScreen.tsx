import { motion } from 'framer-motion';
import { useEffect, useMemo } from 'react';
import { Mascot } from '../components/Mascot';
import { sfx } from '../lib/audio';
import type { LessonResult } from './LessonScreen';

function Confetti() {
  const bits = useMemo(
    () =>
      Array.from({ length: 44 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        delay: Math.random() * 0.5,
        dur: 1.6 + Math.random() * 1.2,
        rot: Math.random() * 720 - 360,
        color: ['var(--success)', 'var(--sky)', 'var(--gold)', 'var(--lilac)', 'var(--accent)'][i % 5],
        w: 8 + Math.random() * 8,
      })),
    [],
  );

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      {bits.map((b) => (
        <motion.div
          key={b.id}
          initial={{ y: -40, opacity: 1, rotate: 0 }}
          animate={{ y: '110vh', opacity: [1, 1, 0], rotate: b.rot }}
          transition={{ duration: b.dur, delay: b.delay, ease: 'linear' }}
          style={{
            position: 'absolute',
            left: `${b.x}%`,
            width: b.w,
            height: b.w * 1.6,
            background: b.color,
            borderRadius: 2,
          }}
        />
      ))}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div
      style={{
        background: color,
        borderRadius: 'var(--r-lg)',
        padding: 2,
        minWidth: 150,
      }}
    >
      <div style={{ color: 'var(--on-color)', fontWeight: 800, fontSize: 'var(--t-tiny)', letterSpacing: 1, padding: '6px 0', textAlign: 'center' }}>
        {label}
      </div>
      <div
        style={{
          background: 'var(--surface)',
          borderRadius: 'var(--r-md)',
          margin: 2,
          padding: '12px 0',
          textAlign: 'center',
          fontSize: 'var(--t-title)',
          fontWeight: 900,
          color,
        }}
      >
        {value}
      </div>
    </div>
  );
}

export function ResultScreen({
  result,
  onContinue,
  onRetry,
}: {
  result: LessonResult;
  onContinue: () => void;
  onRetry: () => void;
}) {
  const legendary = result.mode === 'legendary';

  useEffect(() => {
    if (!result.failed) sfx.levelUp();
    else sfx.heart();
  }, []);

  if (result.failed) {
    return (
      <div style={{ height: '100%', display: 'grid', placeItems: 'center', padding: 32 }}>
        <div style={{ textAlign: 'center', maxWidth: 420 }}>
          <Mascot mood="sad" size={160} />
          <h1 style={{ fontSize: 'var(--t-display)', color: 'var(--danger)', marginTop: 16 }}>
            {legendary ? 'Efsane başarısız' : 'Canların bitti'}
          </h1>
          <p style={{ color: 'var(--ink-2)', fontWeight: 700, marginBottom: 28 }}>
            {legendary
              ? 'Üç hata hakkın doldu. Elmas geri gelmiyor — bir daha denemek için yeniden gir.'
              : 'Canlar yarım saatte bir geri gelir. Dilersen dersi baştan dene.'}
          </p>
          <div style={{ display: 'grid', gap: 12 }}>
            <button className="btn btn--full btn--lg" onClick={onRetry}>
              Tekrar dene
            </button>
            <button className="btn btn--ghost btn--full" onClick={onContinue}>
              Haritaya dön
            </button>
          </div>
        </div>
      </div>
    );
  }

  const perfect = result.accuracy === 1;

  return (
    <div style={{ position: 'relative', height: '100%', display: 'grid', placeItems: 'center', padding: 32 }}>
      <Confetti />
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 18 }}
        style={{ textAlign: 'center', maxWidth: 520 }}
      >
        <Mascot mood="cheer" size={170} />
        <h1 style={{ fontSize: 'var(--t-display)', color: 'var(--gold-dark)', marginTop: 12 }}>
          {legendary ? 'Efsane geçildi!' : perfect ? 'Kusursuz ders!' : 'Ders tamamlandı!'}
        </h1>
        <p style={{ color: 'var(--ink-2)', fontWeight: 700, marginBottom: 28 }}>
          {legendary
            ? 'Bu ders artık efsane. Haritada altın halkasıyla duruyor.'
            : perfect
              ? 'Tek hata bile yok. Okta gururlu.'
              : 'Güzel gidiyorsun, devam et.'}
        </p>

        <div style={{ display: 'flex', gap: 14, justifyContent: 'center', marginBottom: 32, flexWrap: 'wrap' }}>
          <Stat label="TOPLAM XP" value={`+${result.xp}`} color="var(--gold)" />
          <Stat label="İSABET" value={`%${Math.round(result.accuracy * 100)}`} color="var(--success-text)" />
          <Stat label="DOĞRU" value={`${result.correct}/${result.total}`} color="var(--sky-text)" />
        </div>

        <button className="btn btn--lg btn--full" onClick={onContinue}>
          Devam
        </button>
      </motion.div>
    </div>
  );
}
