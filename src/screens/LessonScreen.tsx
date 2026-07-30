import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ExerciseView, grade, correctAnswerText, type AnswerValue } from '../components/Exercises';
import { Mascot } from '../components/Mascot';
import { Close, Crown, Flame, Heart, Speaker } from '../components/Icons';
import { useGame, LEGENDARY_XP } from '../lib/store';
import { sfx, speak } from '../lib/audio';
import type { Exercise, LessonMode } from '../lib/types';

/* Efsanede can yerine tura özel hata hakkı var. */
export const LEGENDARY_MISTAKES = 3;

export type LessonResult = {
  xp: number;
  accuracy: number;
  correct: number;
  total: number;
  failed: boolean;
  /* Turun en uzun doğru serisi — kombo görevi bunu ölçüyor. */
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
  /* Efsanede can harcanmıyor; tura özel hata sayacı var. Can ekonomisi
     derslere ait kalsın, efsane elmasla girilen ayrı bir bahis olsun. */
  const [mistakes, setMistakes] = useState(0);
  const legendary = mode === 'legendary';
  const continueRef = useRef<HTMLButtonElement>(null);

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
      /* Efsanenin ödülü sabit; sonuç ekranı ile store'un aynı sayıyı
         söylemesi için ikisi de bu sabitten okuyor. */
      const xp = legendary ? LEGENDARY_XP : Math.round(10 + accuracy * 10);
      sfx.complete();
      onFinish({ xp, accuracy, correct: right, total, failed: false, bestCombo, mode });
    } else {
      setI((n) => n + 1);
    }
  }

  // Normal derste canlar biterse ders başarısız biter.
  useEffect(() => {
    if (legendary) return;
    if (profile.hearts <= 0 && verdict === 'wrong') {
      const t = setTimeout(() => {
        onFinish({ xp: 0, accuracy: right / total, correct: right, total, failed: true, bestCombo, mode });
      }, 1400);
      return () => clearTimeout(t);
    }
  }, [profile.hearts, verdict]);

  // Efsanede üç hata turu bitirir.
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

  /* Bant nötr zeminde durur; renk sinyalini üstteki çizgi, metin ve maskot
     taşır. Koca renkli bir slab hem koyu temada çamurlaşıyordu hem de paletin
     geri kalanıyla kavga ediyordu. Renkli dolgu artık yalnızca cevap
     kutucuklarında (.tile--right / .tile--wrong). */
  const bannerText = verdict === 'right' ? 'var(--success-text)' : 'var(--danger-text)';
  const bannerEdge = verdict === 'right' ? 'var(--success)' : 'var(--danger)';

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--surface)', overflow: 'hidden' }}>
      {/* Üst bar. Soldaki 96px trafik ışıklarına ayrıldı — pencere başlığı gizli
          olduğu için ✕ düğmesi tam onların üstüne geliyordu. Çubuğun kendisi
          sürükleme alanı; içindeki düğmeler tıklanabilir kalıyor. */}
      <header
        data-tauri-drag-region="deep"
        style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '38px 32px 18px 96px' }}
      >
        {/* Çıkış ve can, düz metin/ikonken zeminde kayboluyordu; ikisi de
            kendi zeminine oturunca her iki temada da net okunuyor. */}
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
        {/* Efsanede kalp yerine taç ve kalan hata hakkı: can harcanmadığı için
            kalp göstermek yanlış bilgi olurdu. */}
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

      {/* alıştırma */}
      {/* `margin: auto` ile dikey ortalama — justify-content: center taşan
          içeriğin üstünü kırpardı. */}
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

      {/* Alt bant — sabit yükseklikli tek kutu.

          Önceden geri bildirim şeridi akışa giriyordu: göründüğü anda kendi
          yüksekliğini kaplayıp üstteki alıştırmayı yukarı itiyor, aynı anda
          translate ile aşağıdan kayıyordu. İkisi üst üste binince hem içerik
          zıplıyor hem şerit pencerenin altından taşıyordu.

          Şimdi kutunun yüksekliği sabit; kontrol satırı hep yerinde duruyor ve
          geri bildirim onun ÜSTÜNE kayıyor. overflow gizli olduğu için de
          dışarı taşmıyor. */}
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
              /* Yay sertti, bant "pat" diye oturuyordu. Sona doğru yavaşlayan
                 uzun bir eğri (easeOutQuint) yumuşak bir kayma veriyor. */
              transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
              /* Odak, bant yerine oturduktan SONRA veriliyor. autoFocus ile
                 düğmeye daha o ekranın altındayken odaklanılıyor, tarayıcı da
                 onu görünür kılmak için üstteki kaydırılabilir alanı zıplatıyordu
                 — animasyonu bozan şey buydu. preventScroll ikinci güvence. */
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
