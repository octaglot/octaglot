import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useGame, MAX_HEARTS, REFILL_COST } from './lib/store';
import { buildLesson, buildReview } from './lib/generate';
import { Logo, Mark, Wordmark } from './components/Logo';
import { Mascot } from './components/Mascot';
import { Bolt, Flame, Gear, Gem, Heart, Home, Lock, Person, Repeat } from './components/Icons';
import { MapScreen } from './screens/MapScreen';
import { StormScreen } from './screens/StormScreen';
import { LessonScreen, type LessonResult } from './screens/LessonScreen';
import { ResultScreen } from './screens/ResultScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import type { Exercise, Lesson, Unit, Word } from './lib/types';

type View =
  | { name: 'map' }
  | { name: 'profile' }
  | { name: 'settings' }
  | { name: 'storm' }
  | { name: 'lesson'; title: string; exercises: Exercise[]; words: Word[]; lesson: Lesson | null }
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
      /* Açılış. Logonun nabız gibi büyüyüp küçülmesi hem rahatsız ediyordu hem
         de yanlış şeyi söylüyordu: marka bir yükleme göstergesi değil. Marka
         bir kez içeri yerleşiyor, "yükleniyor" sinyalini altındaki belirsiz
         ilerleme çubuğu taşıyor. */
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

  if (view.name === 'storm') {
    return <StormScreen onQuit={() => setView({ name: 'map' })} />;
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
        {/* Tekrar modu görünür ama kilitli durur: hangi modların olduğu baştan
            belli olsun, ne zaman açılacağı da kendi üstünde yazsın. */}
        <NavItem
          icon={<Repeat />}
          label="Tekrar"
          on={false}
          onClick={startReview}
          locked={dueCount === 0}
          lockedHint="Birkaç ders sonra açılır"
        />
        {/* Fırtına havuzu bitmiş derslerin kelimelerinden kuruluyor; havuz
            küçükken aynı çift üst üste gelir, o yüzden 20 kelimeden önce
            kilitli duruyor. */}
        <NavItem
          icon={<Bolt />}
          label="Fırtına"
          /* Tekrar gibi tam ekran açılır; rayda etkin hâli hiç görünmez. */
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
            {/* Kare kutucuğun dönmesi tuhaf duruyordu; dönen şey çıplak
                işaret olunca düzgün bir bekleme göstergesi oluyor. */}
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
          <MapScreen onStart={startLesson} />
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
            /* Her iki temada da koyu kalır: --ink kullanınca karanlıkta
               açık zemin + beyaz yazı çıkıp okunmaz oluyordu. */
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

/* Rayın asıl işi: pencerenin tek görevi bugünkü derse girmek, o yüzden sıradaki
   ders haritada aranmadan buradan başlatılabiliyor. Kart aynı zamanda rayın üst
   yarısını dolduruyor — tek başına hedef kartı kalınca altında boşluk kalıyordu. */
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

/* macOS'ta pencere başlığı gizli (titleBarStyle: "Overlay"). Kendi çubuğumuzu
   çizmezsek uygulama bir pencere değil, tam ekran bir web sayfası gibi okunuyor:
   içerik kenardan kenara akıyor ve hiçbir şey "bu bir pencere" demiyor. Bu çubuk
   o eksiği kapatıyor, pencereyi sürüklenebilir yapıyor ve seri/elmas/can
   sayaçlarını sağ raydan alıp asıl yerine — uygulama başlığına — koyuyor.
   Soldaki 84px trafik ışıklarına ayrılmış boşluk. */
function TitleBar({ profile }: { profile: { streak: number; gems: number; hearts: number } }) {
  return (
    <header
      /* "deep": alt ağacın herhangi bir yerinden sürüklenebilir. Çıplak
         (değersiz) hâli yalnızca tıklama hedefi tam bu eleman olduğunda
         çalışıyor, yani markanın ya da sayaçların üstünden sürükleyince
         hiçbir şey olmuyordu. Butonlar "deep" ile de tıklanabilir kalır. */
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
      {/* macOS başlığı ortalar; ikon+ad sola yaslıyken pencere Windows gibi
          okunuyordu. Mutlak konum, soldaki trafik ışıkları markayı kaydırmasın
          diye — çubuk sürükleme alanı olduğu için işaretçi olaylarını da
          markadan geçiriyoruz. */}
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

/* Günlük hedef ile maskot ayrı iki kartken sağ rayın altında kocaman bir boşluk
   kalıyordu. İkisi tek kartta birleşti: hedef çubuğu, Okta'nın çevresini saran
   bir halkaya dönüştü — ilerleme okunurken maskot da onun içinde duruyor. */
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
        {/* Halkanın iç çapı: 2 × (R − çizgi/2) = 139. Maskot `fit="circle"` ile
            kutusunun iç teğet dairesine sığdığı için size doğrudan bu çap
            olabilir; sevinip zıpladığında da halkayı kesmez. */}
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

/* Rayın altını çapalar — yoksa kartların altında dipsiz bir boşluk kalıyor. */
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
            {/* 88 − 2×3 kenarlık = 82 iç çap. `overflow: hidden` kaldırıldı:
                kırpmayı gizlemek yerine çizim çerçeveye sığdırılıyor. */}
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

        {/* Maskotun çizimi Twemoji'den geliyor; CC-BY 4.0 görünür atıf istiyor. */}
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
