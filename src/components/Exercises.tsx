import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Exercise, Word } from '../lib/types';
import { normalize, shuffle, splitWords } from '../lib/generate';
import { sfx, speak } from '../lib/audio';
import { Speaker } from './Icons';

export type AnswerValue = string | string[] | number | null;

/* Alıştırmalar cevabı kendileri tutmaz; ders ekranı tek bir `value` üzerinden
   yönetir, böylece "Kontrol et" butonu ve geri bildirim tek yerde kalır. */
type Props = {
  ex: Exercise;
  value: AnswerValue;
  setValue: (v: AnswerValue) => void;
  locked: boolean;
};

/* Kelime düzeyinde düzenleme mesafesi — yazarak çeviride tek kelimelik
   sapmaları (bir "the", bir çoğul eki) doğru saymak için. */
function wordDistance(a: string[], b: string[]): number {
  const m = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      m[i][j] = Math.min(
        m[i - 1][j] + 1,
        m[i][j - 1] + 1,
        m[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
  }
  return m[a.length][b.length];
}

export function grade(ex: Exercise, value: AnswerValue): boolean {
  switch (ex.kind) {
    case 'flashcard':
      return true;
    case 'choice':
      return value === ex.word.id;
    case 'blank':
      return normalize(String(value ?? '')) === normalize(ex.missing);
    case 'match':
      return value === 'done';
    case 'wordBank':
    case 'listen':
    case 'order': {
      const got = Array.isArray(value) ? value.join(' ') : '';
      return normalize(got) === normalize(ex.sentence.en);
    }
    case 'typeTr': {
      const got = normalize(String(value ?? '')).split(' ').filter(Boolean);
      const want = normalize(ex.sentence.en).split(' ').filter(Boolean);
      if (!got.length) return false;
      return wordDistance(got, want) <= 1;
    }
  }
}

export function correctAnswerText(ex: Exercise): string {
  switch (ex.kind) {
    case 'choice':
      return ex.ask === 'en2tr' ? ex.word.tr : ex.word.en;
    case 'blank':
      return ex.missing;
    case 'wordBank':
    case 'listen':
    case 'order':
    case 'typeTr':
      return ex.sentence.en;
    default:
      return '';
  }
}

const posTr: Record<string, string> = {
  noun: 'isim',
  verb: 'fiil',
  adj: 'sıfat',
  adv: 'zarf',
  pron: 'zamir',
  prep: 'edat',
  conj: 'bağlaç',
  intj: 'ünlem',
  num: 'sayı',
  det: 'belirteç',
  article: 'artikel',
  particle: 'edat',
};

const prompt: React.CSSProperties = {
  fontSize: 'var(--t-title)',
  fontWeight: 800,
  marginBottom: 24,
};

export function ExerciseView({ ex, value, setValue, locked }: Props) {
  switch (ex.kind) {
    case 'flashcard':
      return <Flashcard word={ex.word} onSeen={() => setValue('seen')} />;
    case 'choice':
      return <Choice ex={ex} value={value} setValue={setValue} locked={locked} />;
    case 'match':
      return <Match pairs={ex.pairs} onDone={() => setValue('done')} />;
    case 'blank':
      return <Blank ex={ex} value={value} setValue={setValue} locked={locked} />;
    case 'wordBank':
      return <Bank ex={ex} value={value} setValue={setValue} locked={locked} listen={false} />;
    case 'listen':
      return <Bank ex={ex} value={value} setValue={setValue} locked={locked} listen />;
    case 'order':
      return <Order ex={ex} value={value} setValue={setValue} locked={locked} />;
    case 'typeTr':
      return <TypeIn ex={ex} value={value} setValue={setValue} locked={locked} />;
  }
}

/* ---------------- 1. Kelime kartı ---------------- */

function Flashcard({ word, onSeen }: { word: Word; onSeen: () => void }) {
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    setFlipped(false);
    const t = setTimeout(() => speak(word.en), 350);
    return () => clearTimeout(t);
  }, [word.id]);

  useEffect(() => {
    if (flipped) onSeen();
  }, [flipped]);

  return (
    <div>
      <div style={prompt}>Yeni kelime</div>
      <div
        onClick={() => {
          setFlipped((f) => !f);
          sfx.tap();
        }}
        style={{ perspective: 1200, cursor: 'pointer', maxWidth: 460, margin: '0 auto' }}
      >
        <motion.div
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
          style={{ position: 'relative', height: 240, transformStyle: 'preserve-3d' }}
        >
          <CardFace>
            <div style={{ fontSize: '2.75rem', fontWeight: 900 }}>{word.en}</div>
            {word.pos && (
              <div style={{ color: 'var(--wolf)', fontSize: 'var(--t-small)', marginTop: 6 }}>
                {posTr[word.pos] ?? word.pos}
              </div>
            )}
            <button
              className="btn btn--ghost"
              onClick={(e) => {
                e.stopPropagation();
                speak(word.en);
              }}
              style={{ marginTop: 20 }}
            >
              <Speaker size={20} /> Dinle
            </button>
            <div style={{ position: 'absolute', bottom: 14, color: 'var(--hare)', fontSize: 'var(--t-tiny)' }}>
              Anlamı için karta tıkla
            </div>
          </CardFace>
          <CardFace back>
            <div style={{ fontSize: '2.25rem', fontWeight: 900, color: 'var(--green-dark)' }}>{word.tr}</div>
            {word.alts && (
              <div style={{ color: 'var(--wolf)', marginTop: 10, fontSize: 'var(--t-small)' }}>
                ayrıca: {word.alts.split('|').join(', ')}
              </div>
            )}
            <div style={{ position: 'absolute', bottom: 14, color: 'var(--hare)', fontSize: 'var(--t-tiny)' }}>
              {word.en}
            </div>
          </CardFace>
        </motion.div>
      </div>
    </div>
  );
}

function CardFace({ children, back = false }: { children: React.ReactNode; back?: boolean }) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        backfaceVisibility: 'hidden',
        transform: back ? 'rotateY(180deg)' : undefined,
        background: back ? 'var(--green-wash)' : 'var(--snow)',
        border: `2px solid ${back ? 'var(--green)' : 'var(--swan)'}`,
        borderBottomWidth: 4,
        borderRadius: 'var(--r-xl)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {children}
    </div>
  );
}

/* ---------------- 2. Çoktan seçmeli ---------------- */

function Choice({ ex, value, setValue, locked }: Props & { ex: Extract<Exercise, { kind: 'choice' }> }) {
  const askEn = ex.ask === 'en2tr';
  useEffect(() => {
    if (askEn) speak(ex.word.en);
  }, [ex.word.id]);

  return (
    <div>
      <div style={prompt}>{askEn ? 'Bu kelimenin anlamı ne?' : 'Hangisi doğru çeviri?'}</div>
      <div
        style={{
          fontSize: '2.25rem',
          fontWeight: 900,
          marginBottom: 28,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        {askEn ? ex.word.en : ex.word.tr}
        {askEn && (
          <button
            className="btn btn--ghost"
            onClick={() => speak(ex.word.en)}
            aria-label="Kelimeyi dinle"
            style={{ padding: '8px 12px' }}
          >
            <Speaker size={20} />
          </button>
        )}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, maxWidth: 560 }}>
        {ex.options.map((o) => (
          <button
            key={o.id}
            className={`tile ${value === o.id ? 'tile--on' : ''}`}
            disabled={locked}
            onClick={() => {
              setValue(o.id);
              sfx.tap();
            }}
            style={{ textAlign: 'left', padding: '16px 18px' }}
          >
            {askEn ? o.tr : o.en}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------------- 3. Eşleştirme ---------------- */

function Match({ pairs, onDone }: { pairs: Word[]; onDone: () => void }) {
  const left = useMemo(() => shuffle(pairs), [pairs]);
  const right = useMemo(() => shuffle(pairs), [pairs]);
  const [sel, setSel] = useState<{ side: 'en' | 'tr'; id: number } | null>(null);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [miss, setMiss] = useState<number | null>(null);

  useEffect(() => {
    if (matched.size === pairs.length) onDone();
  }, [matched]);

  function tap(side: 'en' | 'tr', id: number) {
    if (matched.has(id)) return;
    sfx.tap();
    if (!sel) return setSel({ side, id });
    if (sel.side === side) return setSel({ side, id });
    if (sel.id === id) {
      setMatched((m) => new Set(m).add(id));
      setSel(null);
      sfx.correct();
    } else {
      setMiss(id);
      sfx.wrong();
      setTimeout(() => setMiss(null), 400);
      setSel(null);
    }
  }

  const cls = (id: number, side: 'en' | 'tr') =>
    `tile ${matched.has(id) ? 'tile--gone' : ''} ${sel?.id === id && sel.side === side ? 'tile--on' : ''} ${
      miss === id ? 'tile--wrong' : ''
    }`;

  return (
    <div>
      <div style={prompt}>Eşleştir</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, maxWidth: 520 }}>
        <div style={{ display: 'grid', gap: 12 }}>
          {left.map((w) => (
            <button key={`l${w.id}`} className={cls(w.id, 'en')} onClick={() => tap('en', w.id)}>
              {w.en}
            </button>
          ))}
        </div>
        <div style={{ display: 'grid', gap: 12 }}>
          {right.map((w) => (
            <button key={`r${w.id}`} className={cls(w.id, 'tr')} onClick={() => tap('tr', w.id)}>
              {w.tr}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------------- 4. Boşluk doldurma ---------------- */

function Blank({ ex, value, setValue, locked }: Props & { ex: Extract<Exercise, { kind: 'blank' }> }) {
  const tokens = splitWords(ex.sentence.en);
  const idx = tokens.findIndex((t) => normalize(t) === normalize(ex.missing));

  return (
    <div>
      <div style={prompt}>Boşluğu doldur</div>
      <div style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: 12, lineHeight: 1.5 }}>
        {tokens.map((t, i) => (
          <span key={i}>
            {i === idx ? (
              <span
                style={{
                  display: 'inline-block',
                  minWidth: 120,
                  borderBottom: '3px solid var(--hare)',
                  textAlign: 'center',
                  color: 'var(--blue-dark)',
                }}
              >
                {value ? String(value) : ' '}
              </span>
            ) : (
              t
            )}{' '}
          </span>
        ))}
      </div>
      <div style={{ color: 'var(--wolf)', marginBottom: 24 }}>{ex.sentence.tr}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        {ex.options.map((o, i) => (
          <button
            key={i}
            className={`tile ${value === o ? 'tile--on' : ''}`}
            disabled={locked}
            onClick={() => {
              setValue(o);
              sfx.tap();
            }}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------------- 5/6. Kelime bankası ve dinle-yaz ---------------- */

function Bank({
  ex,
  value,
  setValue,
  locked,
  listen,
}: Props & { ex: Extract<Exercise, { kind: 'wordBank' | 'listen' }>; listen: boolean }) {
  const chosen = (Array.isArray(value) ? value : []) as string[];

  useEffect(() => {
    if (listen) speak(ex.sentence.en);
  }, [ex.sentence.id]);

  // Aynı kelime cümlede iki kez geçebilir; bankayı indekse göre tüketiyoruz.
  const used = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of chosen) counts.set(c, (counts.get(c) ?? 0) + 1);
    return counts;
  }, [chosen]);

  const remaining = useMemo(() => {
    const counts = new Map(used);
    return ex.bank.map((w) => {
      const n = counts.get(w) ?? 0;
      if (n > 0) {
        counts.set(w, n - 1);
        return { w, hidden: true };
      }
      return { w, hidden: false };
    });
  }, [ex.bank, used]);

  return (
    <div>
      <div style={prompt}>{listen ? 'Duyduğunu yaz' : 'Bu cümleyi İngilizceye çevir'}</div>

      {listen ? (
        <button
          className="btn btn--blue"
          onClick={() => speak(ex.sentence.en)}
          style={{ marginBottom: 28, padding: '20px 28px', fontSize: '1.5rem' }}
        >
          <><Speaker size={26} /> Tekrar dinle</>
        </button>
      ) : (
        <div style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: 28 }}>{ex.sentence.tr}</div>
      )}

      {/* cevap satırı */}
      <div
        style={{
          minHeight: 72,
          borderTop: '2px solid var(--swan)',
          borderBottom: '2px solid var(--swan)',
          padding: '14px 0',
          marginBottom: 28,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 10,
          alignContent: 'flex-start',
        }}
      >
        {chosen.map((w, i) => (
          <button
            key={`${w}-${i}`}
            className="tile"
            disabled={locked}
            onClick={() => {
              setValue(chosen.filter((_, j) => j !== i));
              sfx.tap();
            }}
          >
            {w}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        {remaining.map(({ w, hidden }, i) => (
          <button
            key={`${w}-${i}`}
            className={`tile ${hidden ? 'tile--gone' : ''}`}
            disabled={locked || hidden}
            onClick={() => {
              setValue([...chosen, w]);
              sfx.tap();
            }}
          >
            {w}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------------- 7. Cümle sıralama ---------------- */

function Order({ ex, value, setValue, locked }: Props & { ex: Extract<Exercise, { kind: 'order' }> }) {
  const scrambled = useMemo(() => shuffle(splitWords(ex.sentence.en)), [ex.sentence.id]);
  const chosen = (Array.isArray(value) ? value : []) as string[];

  const remaining = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of chosen) counts.set(c, (counts.get(c) ?? 0) + 1);
    return scrambled.map((w) => {
      const n = counts.get(w) ?? 0;
      if (n > 0) {
        counts.set(w, n - 1);
        return { w, hidden: true };
      }
      return { w, hidden: false };
    });
  }, [scrambled, chosen]);

  return (
    <div>
      <div style={prompt}>Kelimeleri doğru sıraya diz</div>
      <div style={{ color: 'var(--wolf)', fontSize: 'var(--t-lead)', marginBottom: 24 }}>{ex.sentence.tr}</div>

      <div
        style={{
          minHeight: 64,
          border: '2px dashed var(--swan)',
          borderRadius: 'var(--r-md)',
          padding: 12,
          marginBottom: 24,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 10,
          alignContent: 'flex-start',
        }}
      >
        {chosen.map((w, i) => (
          <button
            key={`${w}-${i}`}
            className="tile"
            disabled={locked}
            onClick={() => {
              setValue(chosen.filter((_, j) => j !== i));
              sfx.tap();
            }}
          >
            {w}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        {remaining.map(({ w, hidden }, i) => (
          <button
            key={`${w}-${i}`}
            className={`tile ${hidden ? 'tile--gone' : ''}`}
            disabled={locked || hidden}
            onClick={() => {
              setValue([...chosen, w]);
              sfx.tap();
            }}
          >
            {w}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------------- 8. Yazarak çeviri ---------------- */

function TypeIn({ ex, value, setValue, locked }: Props & { ex: Extract<Exercise, { kind: 'typeTr' }> }) {
  return (
    <div>
      <div style={prompt}>Bu cümleyi İngilizce yaz</div>
      <div style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: 24 }}>{ex.sentence.tr}</div>
      <textarea
        autoFocus
        disabled={locked}
        value={String(value ?? '')}
        onChange={(e) => setValue(e.target.value)}
        placeholder="İngilizce yaz…"
        rows={3}
        style={{
          width: '100%',
          maxWidth: 560,
          padding: 16,
          fontSize: 'var(--t-lead)',
          fontWeight: 600,
          border: '2px solid var(--swan)',
          borderRadius: 'var(--r-md)',
          resize: 'none',
          color: 'var(--eel)',
        }}
      />
    </div>
  );
}

export { AnimatePresence };
