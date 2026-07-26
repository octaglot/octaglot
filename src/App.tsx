import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useGame, MAX_HEARTS, REFILL_COST } from './lib/store';
import { buildLesson, buildReview } from './lib/generate';
import { Logo, Wordmark } from './components/Logo';
import { Mascot } from './components/Mascot';
import { Flame, Gem, Heart, Home, Person, Repeat } from './components/Icons';
import { MapScreen } from './screens/MapScreen';
import { LessonScreen, type LessonResult } from './screens/LessonScreen';
import { ResultScreen } from './screens/ResultScreen';
import type { Exercise, Lesson, Unit, Word } from './lib/types';

type View =
  | { name: 'map' }
  | { name: 'profile' }
  | { name: 'lesson'; title: string; exercises: Exercise[]; words: Word[]; lesson: Lesson | null }
  | { name: 'result'; result: LessonResult; lesson: Lesson | null; unit: Unit | null };

export default function App() {
  const game = useGame();
  const { ready, profile, todayXp, init, completeLesson, refillHearts, dueWordIds } = game;
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
    setView({ name: 'lesson', title: 'Tekrar dersi', exercises: plan.exercises, words: plan.words, lesson: null });
  }

  async function finish(result: LessonResult, lesson: Lesson | null) {
    if (!result.failed && lesson) await completeLesson(lesson.id, result.accuracy, result.xp);
    else if (!result.failed) await game.addXp(result.xp);
    setView({ name: 'result', result, lesson, unit: lastUnit });
  }

  if (!ready) {
    return (
      <div style={{ height: '100%', display: 'grid', placeItems: 'center' }}>
        <motion.div animate={{ scale: [1, 1.08, 1] }} transition={{ duration: 1.4, repeat: Infinity }}>
          <Wordmark size={56} />
        </motion.div>
      </div>
    );
  }

  // Ders ve sonuç ekranları tüm pencereyi kaplar — dikkat dağılmasın.
  if (view.name === 'lesson') {
    return (
      <LessonScreen
        title={view.title}
        exercises={view.exercises}
        onQuit={() => setView({ name: 'map' })}
        onFinish={(r) => finish(r, view.lesson)}
      />
    );
  }

  if (view.name === 'result') {
    return (
      <ResultScreen
        result={view.result}
        onContinue={() => setView({ name: 'map' })}
        onRetry={() => {
          if (view.lesson && view.unit) void startLesson(view.lesson, view.unit);
          else setView({ name: 'map' });
        }}
      />
    );
  }

  const goalPct = Math.min(100, (todayXp / profile.daily_goal) * 100);

  return (
    <div style={{ height: '100%', display: 'flex', background: 'var(--snow)' }}>
      <nav
        style={{
          width: 'var(--sidebar-w)',
          borderRight: '2px solid var(--swan)',
          padding: '28px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          flexShrink: 0,
        }}
      >
        <div style={{ padding: '0 8px 24px' }}>
          <Wordmark size={34} />
        </div>
        <NavItem icon={<Home />} label="Öğren" on={view.name === 'map'} onClick={() => setView({ name: 'map' })} />
        <NavItem icon={<Repeat />} label="Tekrar" on={false} onClick={startReview} />
        <NavItem icon={<Person />} label="Profil" on={view.name === 'profile'} onClick={() => setView({ name: 'profile' })} />
      </nav>

      <main style={{ flex: 1, minWidth: 0, position: 'relative' }}>
        {loading && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'grid',
              placeItems: 'center',
              zIndex: 5,
              background: 'rgba(255,255,255,.8)',
            }}
          >
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
              <Logo size={44} />
            </motion.div>
          </div>
        )}
        {view.name === 'map' ? <MapScreen onStart={startLesson} /> : <Profile />}
      </main>

      <aside
        style={{
          width: 'var(--rail-w)',
          borderLeft: '2px solid var(--swan)',
          padding: '28px 20px',
          flexShrink: 0,
        }}
        className="scroll"
      >
        <div style={{ display: 'flex', gap: 16, marginBottom: 24, fontWeight: 900 }}>
          <Chip icon={<Flame />} value={profile.streak} color="var(--orange)" title="Gün serisi" />
          <Chip icon={<Gem />} value={profile.gems} color="var(--blue)" title="Elmas" />
          <Chip icon={<Heart />} value={profile.hearts} color="var(--red)" title="Can" />
        </div>

        <Panel title="Günlük hedef">
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, marginBottom: 8 }}>
            <span>{todayXp} XP</span>
            <span style={{ color: 'var(--wolf)' }}>{profile.daily_goal} XP</span>
          </div>
          <div style={{ height: 16, background: 'var(--swan)', borderRadius: 'var(--r-pill)' }}>
            <motion.div
              animate={{ width: `${goalPct}%` }}
              style={{ height: '100%', background: 'var(--gold)', borderRadius: 'var(--r-pill)' }}
            />
          </div>
          {goalPct >= 100 && (
            <div style={{ color: 'var(--green-dark)', fontWeight: 800, marginTop: 10 }}>Hedefi tamamladın! 🎉</div>
          )}
        </Panel>

        {profile.hearts < MAX_HEARTS && (
          <Panel title="Canların eksik">
            <p style={{ color: 'var(--wolf)', fontWeight: 700, margin: '0 0 14px', fontSize: 'var(--t-small)' }}>
              Canlar yarım saatte bir dolar. Beklemek istemezsen elmasla doldurabilirsin.
            </p>
            <button
              className="btn btn--blue btn--full"
              disabled={profile.gems < REFILL_COST}
              onClick={() => refillHearts(true)}
            >
              <Gem size={20} /> {REFILL_COST} · Canları doldur
            </button>
          </Panel>
        )}

        <Panel title="Pako">
          <div style={{ display: 'grid', placeItems: 'center' }}>
            <Mascot mood={profile.hearts === 0 ? 'sad' : goalPct >= 100 ? 'cheer' : 'idle'} size={130} />
            <p style={{ color: 'var(--wolf)', fontWeight: 700, textAlign: 'center', fontSize: 'var(--t-small)' }}>
              {profile.hearts === 0
                ? 'Canların bitti, biraz dinlen.'
                : profile.streak > 0
                  ? `${profile.streak} gündür ara vermedin!`
                  : 'Bugün ilk dersini yap, seri başlasın.'}
            </p>
          </div>
        </Panel>
      </aside>

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
            background: 'var(--eel)',
            color: 'var(--snow)',
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

function NavItem({ icon, label, on, onClick }: { icon: React.ReactNode; label: string; on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 14px',
        borderRadius: 'var(--r-md)',
        border: on ? '2px solid var(--blue)' : '2px solid transparent',
        background: on ? 'var(--blue-wash)' : 'transparent',
        color: on ? 'var(--blue-dark)' : 'var(--wolf)',
        fontWeight: 800,
        letterSpacing: 0.5,
        fontSize: 'var(--t-body)',
        textTransform: 'uppercase',
        width: '100%',
        textAlign: 'left',
      }}
    >
      <span style={{ fontSize: 22 }}>{icon}</span>
      {label}
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

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ border: '2px solid var(--swan)', borderRadius: 'var(--r-lg)', padding: 18, marginBottom: 18 }}>
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
              background: 'var(--green-wash)',
              display: 'grid',
              placeItems: 'center',
              border: '3px solid var(--green)',
              overflow: 'hidden',
            }}
          >
            <Mascot mood="idle" size={64} />
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
                color: 'var(--eel)',
                padding: 0,
                width: 240,
              }}
            />
            <div style={{ color: 'var(--wolf)', fontWeight: 700 }}>{profile.xp} XP toplam</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <Panel title="Gün serisi">
            <Big value={`${profile.streak}`} sub="gün" icon={<Flame size={30} color="var(--orange)" />} />
          </Panel>
          <Panel title="Elmas">
            <Big value={`${profile.gems}`} sub="toplam" icon={<Gem size={30} color="var(--blue)" />} />
          </Panel>
          <Panel title="Biten ders">
            <Big value={`${doneCount}`} sub={`/ ${lessons.length} · %${pct}`} />
          </Panel>
          <Panel title="Biten ünite">
            <Big value={`${unitsDone}`} sub={`/ ${units.length}`} />
          </Panel>
        </div>
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
      <div style={{ color: 'var(--wolf)', fontWeight: 700, fontSize: 'var(--t-small)' }}>{sub}</div>
    </div>
  );
}
