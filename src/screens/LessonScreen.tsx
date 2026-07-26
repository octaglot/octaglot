import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ExerciseView, grade, correctAnswerText, type AnswerValue } from '../components/Exercises';
import { Mascot } from '../components/Mascot';
import { Flame, Heart, Speaker } from '../components/Icons';
import { useGame } from '../lib/store';
import { sfx, speak } from '../lib/audio';
import type { Exercise } from '../lib/types';

export type LessonResult = { xp: number; accuracy: number; correct: number; total: number; failed: boolean };

type Props = {
  title: string;
  exercises: Exercise[];
  onQuit: () => void;
  onFinish: (r: LessonResult) => void;
};

export function LessonScreen({ title, exercises, onQuit, onFinish }: Props) {
  const { profile, loseHeart, reviewWord } = useGame();
  const [i, setI] = useState(0);
  const [value, setValue] = useState<AnswerValue>(null);
  const [verdict, setVerdict] = useState<'none' | 'right' | 'wrong'>('none');
  const [right, setRight] = useState(0);
  const [combo, setCombo] = useState(0);

  const ex = exercises[i];
  const total = exercises.length;
  const progress = (i / total) * 100;

  // Eşleştirme kendi kendine tamamlanır; ayrıca "Kontrol et" gerekmez.
  useEffect(() => {
    if (ex?.kind === 'match' && value === 'done' && verdict === 'none') check();
  }, [value]);

  const canCheck = useMemo(() => {
    if (verdict !== 'none') return true;
    if (!ex) return false;
    if (ex.kind === 'flashcard') return true;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'string') return value.trim().length > 0;
    return value !== null;
  }, [value, verdict, ex]);

  function wordOf(e: Exercise): number | null {
    if (e.kind === 'choice' || e.kind === 'flashcard') return e.word.id;
    return null;
  }

  async function check() {
    if (verdict !== 'none') return next();
    const ok = grade(ex, value);

    // Kart bir sınav değil, tanıtımdır: puanı etkilemez.
    if (ex.kind === 'flashcard') {
      setVerdict('right');
      setRight((r) => r + 1);
      return;
    }

    const wid = wordOf(ex);
    if (wid) void reviewWord(wid, ok);

    if (ok) {
      sfx.correct();
      setRight((r) => r + 1);
      setCombo((c) => c + 1);
      setVerdict('right');
    } else {
      sfx.wrong();
      setCombo(0);
      setVerdict('wrong');
      await loseHeart();
    }
  }

  function next() {
    setVerdict('none');
    setValue(null);
    if (i + 1 >= total) {
      const accuracy = right / total;
      const xp = Math.round(10 + accuracy * 10);
      sfx.complete();
      onFinish({ xp, accuracy, correct: right, total, failed: false });
    } else {
      setI((n) => n + 1);
    }
  }

  // Canlar biterse ders başarısız biter.
  useEffect(() => {
    if (profile.hearts <= 0 && verdict === 'wrong') {
      const t = setTimeout(() => {
        onFinish({ xp: 0, accuracy: right / total, correct: right, total, failed: true });
      }, 1400);
      return () => clearTimeout(t);
    }
  }, [profile.hearts, verdict]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Enter' && canCheck) {
        e.preventDefault();
        void check();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [canCheck, verdict, value, i]);

  if (!ex) return null;

  const banner = verdict === 'right' ? 'var(--green-wash)' : 'var(--red-wash)';
  const bannerText = verdict === 'right' ? 'var(--green-dark)' : 'var(--red-dark)';

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--snow)' }}>
      {/* üst bar */}
      <header style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '20px 32px' }}>
        <button
          onClick={onQuit}
          aria-label="Dersten çık"
          style={{ border: 0, background: 'none', fontSize: 28, color: 'var(--hare)', fontWeight: 800 }}
        >
          ✕
        </button>
        <div style={{ flex: 1, height: 16, background: 'var(--swan)', borderRadius: 'var(--r-pill)' }}>
          <motion.div
            animate={{ width: `${progress}%` }}
            transition={{ type: 'spring', stiffness: 180, damping: 22 }}
            style={{ height: '100%', background: 'var(--green)', borderRadius: 'var(--r-pill)' }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 900, color: 'var(--red)' }}>
          <motion.span
            key={profile.hearts}
            initial={{ scale: 1.6 }}
            animate={{ scale: 1 }}
            style={{ display: 'grid', placeItems: 'center' }}
          >
            <Heart size={26} />
          </motion.span>
          {profile.hearts}
        </div>
      </header>

      {/* alıştırma */}
      {/* `margin: auto` ile dikey ortalama — justify-content: center taşan
          içeriğin üstünü kırpardı. */}
      <div className="scroll" style={{ flex: 1, padding: '12px 32px 32px', display: 'flex' }}>
        <div style={{ maxWidth: 720, width: '100%', margin: 'auto' }}>
          <div style={{ color: 'var(--hare)', fontWeight: 800, fontSize: 'var(--t-tiny)', letterSpacing: 1, marginBottom: 20 }}>
            {title.toLocaleUpperCase('tr')}
            {combo >= 3 && <span style={{ color: 'var(--orange)', marginLeft: 12, display: 'inline-flex', alignItems: 'center', gap: 4, verticalAlign: 'middle' }}>
                <Flame size={16} /> {combo} SERİ
              </span>}
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={i}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.22 }}
            >
              <ExerciseView ex={ex} value={value} setValue={setValue} locked={verdict !== 'none'} />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* geri bildirim + kontrol */}
      <AnimatePresence>
        {verdict !== 'none' && (
          <motion.div
            initial={{ y: 120 }}
            animate={{ y: 0 }}
            exit={{ y: 120 }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
            style={{ background: banner, padding: '20px 32px' }}
          >
            <div
              style={{
                maxWidth: 720,
                margin: '0 auto',
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                color: bannerText,
              }}
            >
              <Mascot mood={verdict === 'right' ? 'happy' : 'sad'} size={64} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 'var(--t-lead)', fontWeight: 900 }}>
                  {verdict === 'right' ? 'Harika!' : 'Doğru cevap:'}
                </div>
                {verdict === 'wrong' && (
                  <div style={{ fontWeight: 700, marginTop: 2 }}>{correctAnswerText(ex)}</div>
                )}
                {ex.kind !== 'flashcard' && ex.kind !== 'match' && 'sentence' in ex && (
                  <button
                    className="btn btn--ghost"
                    onClick={() => speak(ex.sentence.en)}
                    style={{ marginTop: 8, padding: '6px 12px', fontSize: 'var(--t-tiny)' }}
                  >
                    <Speaker size={16} /> Dinle
                  </button>
                )}
              </div>
              <button
                className={`btn ${verdict === 'right' ? '' : 'btn--red'} btn--lg`}
                onClick={next}
                autoFocus
              >
                Devam
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {verdict === 'none' && (
        <footer style={{ borderTop: '2px solid var(--swan)', padding: '20px 32px' }}>
          <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn btn--lg" disabled={!canCheck} onClick={check}>
              {ex.kind === 'flashcard' ? 'Anladım' : 'Kontrol et'}
            </button>
          </div>
        </footer>
      )}
    </div>
  );
}
