import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ExerciseView, grade, correctAnswerText, type AnswerValue } from '../components/Exercises';
import { Mascot } from '../components/Mascot';
import { Close, Crown, Flame, Heart, Speaker } from '../components/Icons';
import { useGame, LEGENDARY_XP } from '../lib/store';
import { sfx, speak } from '../lib/audio';
import type { Exercise, LessonMode } from '../lib/types';

/* Legendary replaces hearts with a per-round mistake allowance. */
export const LEGENDARY_MISTAKES = 3;

export type LessonResult = {
  xp: number;
  accuracy: number;
  correct: number;
  total: number;
  failed: boolean;
  /* Longest correct streak of the round - what the combo quest measures. */
  bestCombo: number;
  mode: LessonMode;
};

type Props = {
  title: string;
  exercises: Exercise[];
  mode?: LessonMode;
  onQuit: () => void;
  onFinish: (r: LessonResult) => void;
};

export function LessonScreen({ title, exercises, mode = 'normal', onQuit, onFinish }: Props) {
  const { profile, loseHeart, reviewWord } = useGame();
  const [i, setI] = useState(0);
  const [value, setValue] = useState<AnswerValue>(null);
  const [verdict, setVerdict] = useState<'none' | 'right' | 'wrong'>('none');
  const [right, setRight] = useState(0);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  /* Legendary costs no hearts; it has its own mistake counter. The heart
     economy stays with lessons, and legendary remains a separate wager entered
     with gems. */
  const [mistakes, setMistakes] = useState(0);
  const legendary = mode === 'legendary';
  const continueRef = useRef<HTMLButtonElement>(null);

  const ex = exercises[i];
  const total = exercises.length;
  const progress = (i / total) * 100;

  // Matching completes itself; it needs no separate check step.
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

    // A card is an introduction, not a test: it does not affect the score.
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
      setCombo((c) => {
        const n = c + 1;
        setBestCombo((b) => Math.max(b, n));
        return n;
      });
      setVerdict('right');
    } else {
      sfx.wrong();
      setCombo(0);
      setVerdict('wrong');
      if (legendary) setMistakes((m) => m + 1);
      else await loseHeart();
    }
  }

  function next() {
    setVerdict('none');
    setValue(null);
    if (i + 1 >= total) {
      const accuracy = right / total;
      /* The legendary reward is fixed; both the result screen and the store read
         it from this constant so they report the same number. */
      const xp = legendary ? LEGENDARY_XP : Math.round(10 + accuracy * 10);
      sfx.complete();
      onFinish({ xp, accuracy, correct: right, total, failed: false, bestCombo, mode });
    } else {
      setI((n) => n + 1);
    }
  }

  // In a normal lesson, running out of hearts fails it.
  useEffect(() => {
    if (legendary) return;
    if (profile.hearts <= 0 && verdict === 'wrong') {
      const t = setTimeout(() => {
        onFinish({ xp: 0, accuracy: right / total, correct: right, total, failed: true, bestCombo, mode });
      }, 1400);
      return () => clearTimeout(t);
    }
  }, [profile.hearts, verdict]);

  // In legendary, three mistakes end the round.
  useEffect(() => {
    if (!legendary) return;
    if (mistakes >= LEGENDARY_MISTAKES && verdict === 'wrong') {
      const t = setTimeout(() => {
        onFinish({ xp: 0, accuracy: right / total, correct: right, total, failed: true, bestCombo, mode });
      }, 1400);
      return () => clearTimeout(t);
    }
  }, [mistakes, verdict]);

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

  /* The band sits on a neutral background; the color signal is carried by the
     rule above it, the text and the mascot. A large colored slab both turned
     muddy in dark mode and fought with the rest of the palette. Colored fills
     now live only on the answer tiles (.tile--right / .tile--wrong). */
  const bannerText = verdict === 'right' ? 'var(--success-text)' : 'var(--danger-text)';
  const bannerEdge = verdict === 'right' ? 'var(--success)' : 'var(--danger)';

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--surface)', overflow: 'hidden' }}>
      {/* Top bar. The 96px on the left is reserved for the traffic lights - with
          the window title hidden, the close button landed right on top of them.
          The bar itself is a drag region; the buttons inside stay clickable. */}
      <header
        data-tauri-drag-region="deep"
        style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '38px 32px 18px 96px' }}
      >
        {/* As plain text and icons, exit and hearts disappeared into the
            background; giving each its own surface makes both legible in either
            theme. */}
        <button
          onClick={onQuit}
          aria-label="Dersten çık"
          style={{
            display: 'grid',
            placeItems: 'center',
            width: 38,
            height: 38,
            flexShrink: 0,
            borderRadius: 'var(--r-pill)',
            border: 0,
            background: 'var(--line)',
            color: 'var(--ink-2)',
          }}
        >
          <Close size={20} />
        </button>
        <div style={{ flex: 1, height: 16, background: 'var(--line)', borderRadius: 'var(--r-pill)' }}>
          <motion.div
            animate={{ width: `${progress}%` }}
            transition={{ type: 'spring', stiffness: 180, damping: 22 }}
            style={{ height: '100%', background: 'var(--brand)', borderRadius: 'var(--r-pill)' }}
          />
        </div>
        {/* Legendary shows a crown and the mistakes left instead of hearts: since
            no hearts are spent, showing them would be misinformation. */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontWeight: 900,
            flexShrink: 0,
            color: legendary ? 'var(--gold-text)' : 'var(--danger-text)',
            background: legendary ? 'var(--gold-wash)' : 'var(--danger-wash)',
            padding: '6px 14px 6px 10px',
            borderRadius: 'var(--r-pill)',
          }}
        >
          <motion.span
            key={legendary ? mistakes : profile.hearts}
            initial={{ scale: 1.6 }}
            animate={{ scale: 1 }}
            style={{ display: 'grid', placeItems: 'center' }}
          >
            {legendary ? <Crown size={22} color="var(--gold)" /> : <Heart size={22} color="var(--danger)" />}
          </motion.span>
          {legendary ? LEGENDARY_MISTAKES - mistakes : profile.hearts}
        </div>
      </header>

      {/* exercise */}
      {/* Vertically centered with `margin: auto` - justify-content: center would
          clip the top of content that overflows. */}
      <div className="scroll" style={{ flex: 1, padding: '12px 32px 32px', display: 'flex' }}>
        <div style={{ maxWidth: 720, width: '100%', margin: 'auto' }}>
          <div style={{ color: 'var(--muted)', fontWeight: 800, fontSize: 'var(--t-tiny)', letterSpacing: 1, marginBottom: 20 }}>
            {title.toLocaleUpperCase('tr')}
            {combo >= 3 && <span style={{ color: 'var(--accent)', marginLeft: 12, display: 'inline-flex', alignItems: 'center', gap: 4, verticalAlign: 'middle' }}>
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

      {/* Bottom band - a single box of fixed height.

          The feedback strip used to take part in the flow: the moment it
          appeared it claimed its own height and pushed the exercise above it
          upward, while sliding in from below with a translate at the same time.
          With those two overlapping, the content jumped and the strip spilled
          out of the bottom of the window.

          Now the box has a fixed height; the control row always stays put and
          the feedback slides in ON TOP of it. With overflow hidden, nothing
          spills out. */}
      <div style={{ position: 'relative', minHeight: 132, flexShrink: 0, overflow: 'hidden' }}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderTop: '2px solid var(--line)',
            padding: '20px 32px',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <div style={{ maxWidth: 720, width: '100%', margin: '0 auto', display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn btn--lg" disabled={!canCheck} onClick={check}>
              {ex.kind === 'flashcard' ? 'Anladım' : 'Kontrol et'}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {verdict !== 'none' && (
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              /* The spring was stiff and the band landed with a thud. A long
                 curve that decelerates toward the end (easeOutQuint) gives a
                 soft slide instead. */
              transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
              /* Focus is given AFTER the band has settled. With autoFocus the
                 button was focused while still below the viewport, and the
                 browser jumped the scrollable area above to reveal it - that was
                 what broke the animation. preventScroll is the second safeguard. */
              onAnimationComplete={() => continueRef.current?.focus({ preventScroll: true })}
              style={{
                position: 'absolute',
                inset: 0,
                background: 'var(--bg)',
                borderTop: `3px solid ${bannerEdge}`,
                padding: '14px 32px',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <div
                style={{
                  maxWidth: 720,
                  width: '100%',
                  margin: '0 auto',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  color: bannerText,
                }}
              >
                <Mascot mood={verdict === 'right' ? 'happy' : 'sad'} size={56} />
                <div style={{ flex: 1, minWidth: 0 }}>
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
                      style={{ marginTop: 6, padding: '5px 12px', fontSize: 'var(--t-tiny)' }}
                    >
                      <Speaker size={16} /> Dinle
                    </button>
                  )}
                </div>
                <button
                  ref={continueRef}
                  className={`btn ${verdict === 'right' ? '' : 'btn--danger'} btn--lg`}
                  onClick={next}
                >
                  Devam
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
