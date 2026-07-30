import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '../lib/store';
import { getWordsByLessons } from '../lib/db';
import { shuffle } from '../lib/rand';
import { sfx } from '../lib/audio';
import { Bolt, Close, Flame } from '../components/Icons';
import { Mascot } from '../components/Mascot';
import {
  STORM_SECONDS,
  STORM_SLOTS,
  STORM_PENALTY,
  STORM_XP_RUNS,
  stormPool,
  stormDraw,
  stormPoints,
} from '../lib/storm';
import type { Word } from '../lib/types';

/* Ders değil arcade: can harcanmaz, yanlış cevap süreden yer. Sahnedeki her
   kelime çifti çözülür çözülmez yerine yenisi gelir — ekran hiç boşalmaz,
   duraklama hissi oluşmaz. */

type Phase = 'loading' | 'play' | 'over';

export function StormScreen({ onQuit }: { onQuit: () => void }) {
  const { lessons, done, dueWordIds, reviewWord, recordStorm, stormBest, stormRunsToday } = useGame();

  /* Tur başındaki değerler: `recordStorm` ikisini de güncelliyor, sonuç ekranı
     canlı store'a bakarsa "rekor kırdın mı" sorusunu kendi yazdığı değere
     sorar. Bir kez yakalanıp sabit tutuluyorlar. */
  const [bestAtStart] = useState(stormBest);
  const [runsAtStart] = useState(stormRunsToday);

  const [phase, setPhase] = useState<Phase>('loading');
  const [stage, setStage] = useState<Word[]>([]);
  const [left, setLeft] = useState<number[]>([]);
  const [right, setRight] = useState<number[]>([]);
  const [sel, setSel] = useState<{ side: 'en' | 'tr'; id: number } | null>(null);
  const [miss, setMiss] = useState<number | null>(null);
  const [gone, setGone] = useState<Set<number>>(new Set());
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [seconds, setSeconds] = useState(STORM_SECONDS);
  const [earnedXp, setEarnedXp] = useState(0);

  const pool = useRef<Word[]>([]);
  const seen = useRef<Set<number>>(new Set());

  /* Havuz bir kez kuruluyor; tur boyunca sabit kalması gerekiyor, yoksa her
     çekimde sıralama değişir ve aynı kelime üst üste gelir. */
  useEffect(() => {
    let alive = true;
    (async () => {
      const doneLessons = lessons.filter((l) => done.has(l.id)).map((l) => l.id);
      const [words, due] = await Promise.all([getWordsByLessons(doneLessons), dueWordIds(200)]);
      if (!alive) return;
      pool.current = stormPool(words, due);
      const first = stormDraw(pool.current, [], seen.current, STORM_SLOTS);
      first.forEach((w) => seen.current.add(w.id));
      setStage(first);
      setLeft(shuffle(first).map((w) => w.id));
      setRight(shuffle(first).map((w) => w.id));
      setPhase('play');
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Geri sayım. Süre bitince tur kapanır.
  useEffect(() => {
    if (phase !== 'play') return;
    const t = setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [phase]);

  useEffect(() => {
    if (phase === 'play' && seconds === 0) {
      setPhase('over');
      sfx.complete();
      void recordStorm(score).then(setEarnedXp);
    }
  }, [seconds, phase]);

  const byId = useMemo(() => new Map(stage.map((w) => [w.id, w])), [stage]);

  function replace(id: number) {
    /* Çözülen çift sahneden çıkıyor, yerine havuzdan yenisi geliyor. Yeni
       kelime iki sütuna da rastgele bir yere giriyor ki göz alışkanlığı
       oluşmasın. */
    const next = stormDraw(pool.current, stage.map((w) => w.id), seen.current, 1)[0];
    setStage((st) => {
      const rest = st.filter((w) => w.id !== id);
      return next ? [...rest, next] : rest;
    });
    setGone((g) => {
      const n = new Set(g);
      n.add(id);
      return n;
    });
    if (next) {
      seen.current.add(next.id);
      setLeft((l) => insertRandom(l.filter((x) => x !== id), next.id));
      setRight((r) => insertRandom(r.filter((x) => x !== id), next.id));
    } else {
      setLeft((l) => l.filter((x) => x !== id));
      setRight((r) => r.filter((x) => x !== id));
    }
  }

  function tap(side: 'en' | 'tr', id: number) {
    if (phase !== 'play' || gone.has(id)) return;
    sfx.tap();
    if (!sel || sel.side === side) return setSel({ side, id });

    if (sel.id === id) {
      const c = combo + 1;
      sfx.correct();
      setCombo(c);
      setBestCombo((b) => Math.max(b, c));
      setScore((s) => s + stormPoints(c));
      setSel(null);
      void reviewWord(id, true);
      replace(id);
    } else {
      sfx.wrong();
      setCombo(0);
      setSeconds((s) => Math.max(0, s - STORM_PENALTY));
      setMiss(id);
      setTimeout(() => setMiss(null), 400);
      setSel(null);
      void reviewWord(sel.id, false);
    }
  }

  const cls = (id: number, side: 'en' | 'tr') =>
    `tile ${gone.has(id) ? 'tile--gone' : ''} ${sel?.id === id && sel.side === side ? 'tile--on' : ''} ${
      miss === id ? 'tile--wrong' : ''
    }`;

  if (phase === 'loading') {
    return <div style={{ height: '100%', display: 'grid', placeItems: 'center', background: 'var(--surface)' }} />;
  }

  if (phase === 'over') {
    const record = score > bestAtStart;
    /* XP çıkmamasının iki ayrı sebebi var; ikisini aynı cümleyle geçiştirmek
       yanlış bilgi veriyordu. */
    const xpNote =
      earnedXp > 0
        ? `+${earnedXp} XP`
        : runsAtStart >= STORM_XP_RUNS
          ? 'Bugünün XP hakkı doldu — puan için oynamaya devam.'
          : 'XP kazanmak için en az 25 puan gerekiyor.';
    return (
      <div style={{ height: '100%', display: 'grid', placeItems: 'center', background: 'var(--surface)', padding: 32 }}>
        <div style={{ textAlign: 'center', maxWidth: 420 }}>
          <Mascot mood={record ? 'cheer' : 'idle'} size={150} />
          <h2 style={{ fontSize: 'var(--t-title)', margin: '18px 0 6px' }}>
            {record ? 'Yeni rekor!' : 'Süre doldu'}
          </h2>
          <div style={{ fontSize: '3rem', fontWeight: 900, color: 'var(--brand-text)' }}>{score}</div>
          <p style={{ color: 'var(--ink-2)', fontWeight: 700, margin: '6px 0 4px' }}>
            En uzun seri {bestCombo} · Rekor {Math.max(bestAtStart, score)}
          </p>
          <p style={{ color: 'var(--ink-2)', fontWeight: 700, marginTop: 0 }}>{xpNote}</p>
          <button className="btn btn--lg btn--full" style={{ marginTop: 22 }} onClick={onQuit}>
            Bitir
          </button>
        </div>
      </div>
    );
  }

  const pct = (seconds / STORM_SECONDS) * 100;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--surface)', overflow: 'hidden' }}>
      <header
        data-tauri-drag-region="deep"
        style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '38px 32px 18px 96px' }}
      >
        <button
          onClick={onQuit}
          aria-label="Fırtınadan çık"
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
        {/* Süre çubuğu son 10 saniyede kırmızıya döner — sayıya bakmadan da
            aciliyet okunsun. */}
        <div style={{ flex: 1, height: 16, background: 'var(--line)', borderRadius: 'var(--r-pill)' }}>
          <motion.div
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.3, ease: 'linear' }}
            style={{
              height: '100%',
              background: seconds <= 10 ? 'var(--danger)' : 'var(--brand)',
              borderRadius: 'var(--r-pill)',
            }}
          />
        </div>
        <div style={{ fontWeight: 900, minWidth: 38, textAlign: 'right' }}>{seconds}</div>
      </header>

      <div className="scroll" style={{ flex: 1, padding: '12px 32px 32px', display: 'flex' }}>
        <div style={{ maxWidth: 560, width: '100%', margin: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 900, fontSize: 'var(--t-lead)' }}>
              <Bolt size={22} color="var(--brand)" /> {score}
            </span>
            <AnimatePresence>
              {combo >= 3 && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--accent)', fontWeight: 800 }}
                >
                  <Flame size={16} /> {combo} SERİ
                </motion.span>
              )}
            </AnimatePresence>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ display: 'grid', gap: 12 }}>
              {left.map((id) => (
                <button key={`l${id}`} className={cls(id, 'en')} onClick={() => tap('en', id)}>
                  {byId.get(id)?.en ?? ''}
                </button>
              ))}
            </div>
            <div style={{ display: 'grid', gap: 12 }}>
              {right.map((id) => (
                <button key={`r${id}`} className={cls(id, 'tr')} onClick={() => tap('tr', id)}>
                  {byId.get(id)?.tr ?? ''}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Yeni kartı listeye rastgele bir yere sokar — hep sona eklenirse göz alışır. */
function insertRandom(ids: number[], id: number): number[] {
  const at = Math.floor(Math.random() * (ids.length + 1));
  return [...ids.slice(0, at), id, ...ids.slice(at)];
}
