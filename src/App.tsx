import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useGame, MAX_HEARTS, REFILL_COST, LEGENDARY_COST } from './lib/store';
import { buildLesson, buildReview, buildLegendary } from './lib/generate';
import { Logo, Mark, Wordmark } from './components/Logo';
import { Mascot } from './components/Mascot';
import { QuestCard } from './components/QuestCard';
import { Bolt, Flame, Gear, Gem, Heart, Home, Lock, Person, Repeat } from './components/Icons';
import { MapScreen } from './screens/MapScreen';
import { StormScreen } from './screens/StormScreen';
import { LessonScreen, type LessonResult } from './screens/LessonScreen';
import { ResultScreen } from './screens/ResultScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import type { Exercise, Lesson, LessonMode, Unit, Word } from './lib/types';

type View =
  | { name: 'map' }
  | { name: 'profile' }
  | { name: 'settings' }
  | { name: 'storm' }
  | { name: 'lesson'; title: string; exercises: Exercise[]; words: Word[]; lesson: Lesson | null; mode: LessonMode }
  | { name: 'result'; result: LessonResult; lesson: Lesson | null; unit: Unit | null };

export default function App() {
  const game = useGame();
  const { ready, profile, todayXp, dueCount, init, completeLesson, refillHearts, dueWordIds } = game;
  const [view, setView] = useState<View>({ name: 'map' });
  const [loading, setLoading] = useState(false);
  const [lastUnit, setLastUnit] = useState<Unit | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    void init();
  }, []);

  async function startLesson(lesson: Lesson, unit: Unit) {
    if (profile.hearts <= 0) {
      setNotice('Canların bitti. Yarım saatte bir yenilenir ya da elmasla doldurabilirsin.');
      return;
    }
    setLoading(true);
    const plan = await buildLesson(lesson.id, unit.id);
    setLoading(false);
    setLastUnit(unit);
    if (!plan.exercises.length) {
      setNotice('Bu ders için içerik bulunamadı.');
      return;
    }
    setView({
      name: 'lesson',
      title: `${unit.title} · Ders ${lesson.idx}`,
      exercises: plan.exercises,
      words: plan.words,
      lesson,
      mode: 'normal',
    });
  }

  /* Legendary round. The gems are spent only AFTER the content is confirmed to
     be ready, so nobody pays for a unit that cannot build any questions. */
  async function startLegendaryLesson(lesson: Lesson, unit: Unit) {
    if (profile.gems < LEGENDARY_COST) {
      setNotice(`Efsane için ${LEGENDARY_COST} elmas gerekiyor.`);
      return;
    }
    setLoading(true);
    const plan = await buildLegendary(unit.id);
    if (!plan.exercises.length) {
      setLoading(false);
      setNotice('Bu ünite için efsane turu kurulamadı.');
      return;
    }
    const paid = await game.startLegendary();
    setLoading(false);
    if (!paid) {
      setNotice(`Efsane için ${LEGENDARY_COST} elmas gerekiyor.`);
      return;
    }
    setLastUnit(unit);
    setView({
      name: 'lesson',
      title: `${unit.title} · Efsane`,
      exercises: plan.exercises,
      words: plan.words,
      lesson,
      mode: 'legendary',
    });
  }

  async function startReview() {
    setLoading(true);
    const ids = await dueWordIds(20);
    const plan = await buildReview(ids);
    setLoading(false);
    if (!plan.exercises.length) {
      setNotice('Tekrar edilecek kelime yok. Birkaç ders yaptıktan sonra burası dolar.');
      return;
    }
    setView({
      name: 'lesson',
      title: 'Tekrar dersi',
      exercises: plan.exercises,
      words: plan.words,
      lesson: null,
      mode: 'normal',
    });
  }

  async function finish(result: LessonResult, lesson: Lesson | null) {
    if (result.mode === 'legendary') {
      if (!result.failed && lesson) await game.completeLegendary(lesson.id);
    } else if (!result.failed && lesson) {
      await completeLesson(lesson.id, result.accuracy, result.xp);
    } else if (!result.failed) {
      await game.addXp(result.xp);
    }
    // The longest streak counts even in a failed lesson: the quest measures
    // "correct answers", not "completion".
    await game.bumpQuest('combo', result.bestCombo);
    setView({ name: 'result', result, lesson, unit: lastUnit });
  }

  if (!ready) {
    return (
      /* Splash. Pulsing the logo was both irritating and said the wrong thing:
         a brand is not a loading indicator. The mark settles in once, and the
         indeterminate progress bar below it carries the "loading" signal. */
      <div style={{ height: '100%', display: 'grid', placeItems: 'center', background: 'var(--bg)' }}>
        <div style={{ display: 'grid', justifyItems: 'center', gap: 24 }}>
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            style={{ display: 'flex', alignItems: 'center', gap: 16 }}
          >
            <Logo size={56} />
            <span style={{ fontSize: 37, fontWeight: 900, letterSpacing: '-0.03em', color: 'var(--ink)' }}>
              Octaglot
            </span>
          </motion.div>

          <div
            style={{
              width: 190,
              height: 3,
              borderRadius: 'var(--r-pill)',
              background: 'var(--line)',
              overflow: 'hidden',
            }}
          >
            <motion.div
              animate={{ x: ['-100%', '265%'] }}
              transition={{ duration: 1.15, repeat: Infinity, ease: 'easeInOut' }}
              style={{ width: '38%', height: '100%', borderRadius: 'var(--r-pill)', background: 'var(--brand)' }}
            />
          </div>
        </div>
      </div>
    );
  }

  // The lesson and result screens take the whole window, to avoid distraction.
  if (view.name === 'lesson') {
    return (
      <LessonScreen
        title={view.title}
        exercises={view.exercises}
        mode={view.mode}
        onQuit={() => setView({ name: 'map' })}
        onFinish={(r) => finish(r, view.lesson)}
      />
    );
  }

  if (view.name === 'storm') {
    return <StormScreen onQuit={() => setView({ name: 'map' })} />;
  }

  if (view.name === 'result') {
    return (
      <ResultScreen
        result={view.result}
        onContinue={() => setView({ name: 'map' })}
        onRetry={() => {
          if (view.lesson && view.unit) {
            if (view.result.mode === 'legendary') void startLegendaryLesson(view.lesson, view.unit);
            else void startLesson(view.lesson, view.unit);
          } else setView({ name: 'map' });
        }}
      />
    );
  }

  const goalPct = Math.min(100, (todayXp / profile.daily_goal) * 100);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      <TitleBar profile={profile} />

      <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
      <nav
        style={{
          width: 'var(--sidebar-w)',
          borderRight: '2px solid var(--line)',
          padding: '20px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          flexShrink: 0,
        }}
      >
        <NavItem icon={<Home />} label="Öğren" on={view.name === 'map'} onClick={() => setView({ name: 'map' })} />
        {/* Review mode is visible but locked: which modes exist should be clear
            from the start, and each one states its own unlock condition. */}
        <NavItem
          icon={<Repeat />}
          label="Tekrar"
          on={false}
          onClick={startReview}
          locked={dueCount === 0}
          lockedHint="Birkaç ders sonra açılır"
        />
        {/* The storm pool is built from the words of completed lessons; while it
            is small the same pair keeps reappearing, so it stays locked until
            20 words are learned. */}
        <NavItem
          icon={<Bolt />}
          label="Fırtına"
          /* Opens full screen like review, so its active state never shows in
             the rail. */
          on={false}
          onClick={() => setView({ name: 'storm' })}
          locked={game.learnedWordCount < 20}
          lockedHint="20 kelime öğrenince açılır"
        />
        <NavItem icon={<Person />} label="Profil" on={view.name === 'profile'} onClick={() => setView({ name: 'profile' })} />
        <NavItem icon={<Gear />} label="Ayarlar" on={view.name === 'settings'} onClick={() => setView({ name: 'settings' })} />
      </nav>

      <main style={{ flex: 1, minWidth: 0, position: 'relative', background: 'var(--surface)' }}>
        {loading && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'grid',
              placeItems: 'center',
              zIndex: 5,
              background: 'var(--surface)',
              opacity: 0.86,
            }}
          >
            {/* Spinning the square tile looked odd; once the thing spinning is
                the bare mark it reads as a proper waiting indicator. */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.1, repeat: Infinity, ease: 'linear' }}
              style={{ display: 'grid', placeItems: 'center' }}
            >
              <Mark width={52} color="var(--brand)" />
            </motion.div>
          </div>
        )}
        {view.name === 'map' ? (
          <MapScreen onStart={startLesson} onLegendary={startLegendaryLesson} />
        ) : view.name === 'settings' ? (
          <SettingsScreen />
        ) : (
          <Profile />
        )}
      </main>

      <aside
        style={{
          width: 'var(--rail-w)',
          borderLeft: '2px solid var(--line)',
          padding: '24px 20px',
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
        }}
        className="scroll"
      >
        <NextLessonCard onStart={startLesson} />

        <GoalCard
          todayXp={todayXp}
          goal={profile.daily_goal}
          pct={goalPct}
          hearts={profile.hearts}
          streak={profile.streak}
        />

        <QuestCard />

        {profile.hearts < MAX_HEARTS && (
          <Panel title="Canların eksik">
            <p style={{ color: 'var(--ink-2)', fontWeight: 700, margin: '0 0 14px', fontSize: 'var(--t-small)' }}>
              Canlar yarım saatte bir dolar. Beklemek istemezsen elmasla doldurabilirsin.
            </p>
            <button
              className="btn btn--sky btn--full"
              disabled={profile.gems < REFILL_COST}
              onClick={() => refillHearts(true)}
            >
              <Gem size={20} /> {REFILL_COST} · Canları doldur
            </button>
          </Panel>
        )}

        <RailFooter />
      </aside>
      </div>

      {notice && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          onAnimationComplete={() => setTimeout(() => setNotice(null), 3200)}
          style={{
            position: 'fixed',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            /* Stays dark in both themes: with --ink, dark mode produced a light
               fill with white text and became unreadable. */
            background: 'var(--titlebar)',
            color: 'var(--titlebar-text)',
            border: '1px solid rgba(255,255,255,.08)',
            padding: '14px 22px',
            borderRadius: 'var(--r-lg)',
            fontWeight: 700,
            boxShadow: 'var(--shadow-pop)',
            maxWidth: 520,
          }}
        >
          {notice}
        </motion.div>
      )}
    </div>
  );
}

function NavItem({
  icon,
  label,
  on,
  onClick,
  locked = false,
  lockedHint,
}: {
  icon: React.ReactNode;
  label: string;
  on: boolean;
  onClick: () => void;
  locked?: boolean;
  lockedHint?: string;
}) {
  return (
    <button
      onClick={locked ? undefined : onClick}
      disabled={locked}
      title={locked ? lockedHint : undefined}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 14px',
        borderRadius: 'var(--r-md)',
        border: on ? '2px solid var(--brand)' : '2px solid transparent',
        background: on ? 'var(--brand-wash)' : 'transparent',
        color: locked ? 'var(--muted)' : on ? 'var(--brand-text)' : 'var(--ink-2)',
        cursor: locked ? 'default' : 'pointer',
        fontWeight: 800,
        letterSpacing: '-0.01em',
        fontSize: 'var(--t-body)',
        width: '100%',
        textAlign: 'left',
      }}
    >
      <span style={{ fontSize: 22, display: 'grid', placeItems: 'center' }}>{icon}</span>
      <span style={{ flex: 1 }}>{label}</span>
      {locked && (
        <span style={{ display: 'grid', placeItems: 'center', opacity: 0.85 }}>
          <Lock size={16} />
        </span>
      )}
    </button>
  );
}

function Chip({ icon, value, color, title }: { icon: React.ReactNode; value: number; color: string; title: string }) {
  return (
    <div title={title} style={{ display: 'flex', alignItems: 'center', gap: 6, color }}>
      {icon}
      {value}
    </div>
  );
}

/* What the rail is really for: the window's one job is to get you into today's
   lesson, so the next lesson can be started from here without hunting for it on
   the map. The card also fills the upper half of the rail - with only the goal
   card there, a gap opened up underneath. */
function NextLessonCard({ onStart }: { onStart: (lesson: Lesson, unit: Unit) => void }) {
  const { lessons, units, done } = useGame();
  const next = lessons.find((l) => !done.has(l.id));
  const unit = next ? units.find((u) => u.id === next.unit_id) : undefined;

  if (!next || !unit) {
    return (
      <section style={{ border: '2px solid var(--line)', borderRadius: 'var(--r-xl)', padding: 20, background: 'var(--surface)', marginBottom: 16 }}>
        <h3 style={{ fontSize: 'var(--t-body)' }}>Kurs bitti</h3>
        <p style={{ color: 'var(--ink-2)', fontWeight: 700, fontSize: 'var(--t-small)', margin: '6px 0 0' }}>
          Bütün dersleri bitirdin. Tekrar dersiyle kelimeleri taze tut.
        </p>
      </section>
    );
  }

  return (
    <section style={{ border: '2px solid var(--line)', borderRadius: 'var(--r-xl)', padding: 20, background: 'var(--surface)', marginBottom: 16 }}>
      <div style={{ fontSize: 'var(--t-tiny)', fontWeight: 800, letterSpacing: 1, color: 'var(--muted)' }}>SIRADA</div>
      <h3 style={{ fontSize: 'var(--t-lead)', margin: '4px 0 2px' }}>{unit.title}</h3>
      <div style={{ color: 'var(--ink-2)', fontWeight: 700, fontSize: 'var(--t-small)', marginBottom: 16 }}>
        {unit.cefr} · Ünite {unit.id} · Ders {next.idx}
      </div>
      <button className="btn btn--full" onClick={() => onStart(next, unit)}>
        Derse başla
      </button>
    </section>
  );
}

/* On macOS the window title is hidden (titleBarStyle: "Overlay"). Without
   drawing our own bar the app reads as a full-screen web page rather than a
   window: content runs edge to edge and nothing says "this is a window". This
   bar fills that gap, makes the window draggable, and moves the streak/gem/heart
   counters out of the right rail into where they belong - the app title.
   The 84px on the left is space reserved for the traffic lights. */
function TitleBar({ profile }: { profile: { streak: number; gems: number; hearts: number } }) {
  return (
    <header
      /* "deep": draggable from anywhere in the subtree. The bare (valueless)
         form only works when the click target is exactly this element, so
         dragging from the mark or the counters did nothing. Buttons stay
         clickable under "deep" as well. */
      data-tauri-drag-region="deep"
      style={{
        height: 56,
        flexShrink: 0,
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        padding: '0 22px 0 84px',
        background: 'var(--titlebar)',
      }}
    >
      {/* macOS centers the title; with the icon and name pinned left, the window
          read as Windows. Absolute positioning keeps the traffic lights from
          shifting the mark - and since the bar is a drag region, we let pointer
          events pass through the mark too. */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          pointerEvents: 'none',
        }}
      >
        <Wordmark size={26} color="var(--titlebar-text)" />
      </div>
      <div style={{ marginLeft: 'auto', display: 'flex', gap: 18, fontWeight: 900, position: 'relative' }}>
        <Chip icon={<Flame />} value={profile.streak} color="var(--accent)" title="Gün serisi" />
        <Chip icon={<Gem />} value={profile.gems} color="var(--sky)" title="Elmas" />
        <Chip icon={<Heart />} value={profile.hearts} color="var(--danger)" title="Can" />
      </div>
    </header>
  );
}

/* With the daily goal and the mascot as two separate cards, a large gap opened
   at the bottom of the right rail. They were merged into one card: the goal bar
   became a ring wrapped around Okta - you read the progress and the mascot sits
   inside it. */
function GoalCard({
  todayXp,
  goal,
  pct,
  hearts,
  streak,
}: {
  todayXp: number;
  goal: number;
  pct: number;
  hearts: number;
  streak: number;
}) {
  const R = 74;
  const CIRC = 2 * Math.PI * R;
  const box = 172;
  const done = pct >= 100;

  return (
    <section style={{ border: '2px solid var(--line)', borderRadius: 'var(--r-xl)', padding: '22px 18px 20px', background: 'var(--surface)', marginBottom: 16 }}>
      <div style={{ position: 'relative', width: box, height: box, margin: '0 auto' }}>
        <svg width={box} height={box} style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }} aria-hidden="true">
          <circle cx={box / 2} cy={box / 2} r={R} fill="none" stroke="var(--line)" strokeWidth="9" />
          <motion.circle
            cx={box / 2}
            cy={box / 2}
            r={R}
            fill="none"
            stroke={done ? 'var(--success)' : 'var(--gold)'}
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray={CIRC}
            initial={false}
            animate={{ strokeDashoffset: CIRC * (1 - Math.min(1, pct / 100)) }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </svg>
        {/* Inner diameter of the ring: 2 * (R - stroke/2) = 139. With
            `fit="circle"` the mascot fits its box's inscribed circle, so size
            can be that diameter directly; it will not cut the ring even when it
            bounces with joy. */}
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
          <Mascot mood={hearts === 0 ? 'sad' : done ? 'cheer' : 'idle'} size={2 * (R - 4.5)} fit="circle" />
        </div>
      </div>

      <div style={{ textAlign: 'center', marginTop: 14 }}>
        <div style={{ fontWeight: 900, fontSize: 'var(--t-lead)' }}>
          {todayXp}
          <span style={{ color: 'var(--muted)' }}> / {goal} XP</span>
        </div>
        <p style={{ color: 'var(--ink-2)', fontWeight: 700, fontSize: 'var(--t-small)', margin: '6px 0 0' }}>
          {hearts === 0
            ? 'Canların bitti, biraz dinlen.'
            : done
              ? 'Günlük hedefi tamamladın.'
              : streak > 0
                ? `${streak} gündür ara vermedin.`
                : 'Bugün ilk dersini yap, seri başlasın.'}
        </p>
      </div>
    </section>
  );
}

/* Anchors the bottom of the rail - without it a bottomless gap sits under the
   cards. */
function RailFooter() {
  const { done, lessons, units, profile } = useGame();
  const unitsDone = units.filter((u) => lessons.filter((l) => l.unit_id === u.id).every((l) => done.has(l.id))).length;
  return (
    <div
      style={{
        marginTop: 'auto',
        paddingTop: 20,
        borderTop: '2px solid var(--line)',
        display: 'flex',
        justifyContent: 'space-between',
      }}
    >
      <RailStat value={`${done.size}`} label="ders" />
      <RailStat value={`${unitsDone}`} label="ünite" />
      <RailStat value={`${profile.xp}`} label="XP" />
    </div>
  );
}

function RailStat({ value, label }: { value: string; label: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontWeight: 900, fontSize: 'var(--t-lead)' }}>{value}</div>
      <div style={{ color: 'var(--muted)', fontWeight: 800, fontSize: 'var(--t-tiny)', letterSpacing: 0.6 }}>{label}</div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ border: '2px solid var(--line)', borderRadius: 'var(--r-lg)', padding: 18, marginBottom: 18 }}>
      <h3 style={{ fontSize: 'var(--t-body)', marginBottom: 12 }}>{title}</h3>
      {children}
    </section>
  );
}

function Profile() {
  const { profile, done, lessons, units, setName } = useGame();
  const doneCount = done.size;
  const pct = Math.round((doneCount / Math.max(1, lessons.length)) * 100);
  const unitsDone = units.filter((u) => lessons.filter((l) => l.unit_id === u.id).every((l) => done.has(l.id))).length;

  return (
    <div className="scroll" style={{ height: '100%', padding: 32 }}>
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 32 }}>
          <div
            style={{
              width: 88,
              height: 88,
              borderRadius: '50%',
              background: 'var(--brand-wash)',
              display: 'grid',
              placeItems: 'center',
              border: '3px solid var(--brand)',
            }}
          >
            {/* 88 - 2x3 border = 82 inner diameter. `overflow: hidden` was
                removed: rather than hiding the clipping, the artwork is fitted
                to the frame. */}
            <Mascot mood="idle" size={82} fit="circle" />
          </div>
          <div>
            <input
              value={profile.name}
              onChange={(e) => setName(e.target.value)}
              aria-label="Adın"
              style={{
                fontSize: 'var(--t-title)',
                fontWeight: 900,
                border: 0,
                background: 'transparent',
                color: 'var(--ink)',
                padding: 0,
                width: 240,
              }}
            />
            <div style={{ color: 'var(--ink-2)', fontWeight: 700 }}>{profile.xp} XP toplam</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <Panel title="Gün serisi">
            <Big value={`${profile.streak}`} sub="gün" icon={<Flame size={30} color="var(--accent)" />} />
          </Panel>
          <Panel title="Elmas">
            <Big value={`${profile.gems}`} sub="toplam" icon={<Gem size={30} color="var(--sky)" />} />
          </Panel>
          <Panel title="Biten ders">
            <Big value={`${doneCount}`} sub={`/ ${lessons.length} · %${pct}`} />
          </Panel>
          <Panel title="Biten ünite">
            <Big value={`${unitsDone}`} sub={`/ ${units.length}`} />
          </Panel>
        </div>

        <div style={{ marginTop: 18 }}>
          <QuestCard />
        </div>

        {/* The mascot artwork comes from Twemoji; CC-BY 4.0 requires visible
            attribution. */}
        <p
          style={{
            marginTop: 28,
            fontSize: 'var(--t-tiny)',
            color: 'var(--muted)',
            lineHeight: 1.6,
            textAlign: 'center',
          }}
        >
          Okta'nın çizimi{' '}
          <a href="https://github.com/jdecked/twemoji" target="_blank" rel="noreferrer" style={{ color: 'inherit' }}>
            Twemoji
          </a>{' '}
          ahtapot emojisinden uyarlandı · CC-BY 4.0
        </p>
      </div>
    </div>
  );
}

function Big({ value, sub, icon }: { value: string; sub: string; icon?: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 'var(--t-display)', fontWeight: 900, display: 'flex', alignItems: 'center', gap: 8 }}>
        {icon}
        {value}
      </div>
      <div style={{ color: 'var(--ink-2)', fontWeight: 700, fontSize: 'var(--t-small)' }}>{sub}</div>
    </div>
  );
}
