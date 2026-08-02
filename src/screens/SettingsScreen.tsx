import { useState } from 'react';
import { useGame } from '../lib/store';
import { useTheme, type Theme } from '../lib/theme';
import { setRate, speak, storedRate } from '../lib/audio';
import { Speaker } from '../components/Icons';

/* Settings. The theme choice lives in localStorage and the daily goal in the
   user database - one is an interface preference, the other part of progress. */

const THEMES: { value: Theme; label: string; hint: string }[] = [
  { value: 'dark', label: 'Koyu', hint: 'Varsayılan' },
  { value: 'light', label: 'Açık', hint: 'Aydınlık ortam' },
  { value: 'system', label: 'Otomatik', hint: 'Kendiliğinden ayarlanır' },
];

const GOALS = [
  { value: 20, label: 'Rahat', hint: '20 XP · bir ders' },
  { value: 50, label: 'Normal', hint: '50 XP · iki üç ders' },
  { value: 100, label: 'Ciddi', hint: '100 XP · beş ders' },
];

export function SettingsScreen() {
  const { profile, setDailyGoal } = useGame();
  const [theme, setTheme] = useTheme();

  return (
    <div className="scroll" style={{ height: '100%', padding: 32 }}>
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        <h1 style={{ fontSize: 'var(--t-display)', marginBottom: 28 }}>Ayarlar</h1>

        <Group title="Görünüm" note="Uygulama koyu temayla açılır.">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {THEMES.map((t) => (
              <Option
                key={t.value}
                selected={theme === t.value}
                label={t.label}
                hint={t.hint}
                onClick={() => setTheme(t.value)}
              >
                <ThemeSwatch value={t.value} />
              </Option>
            ))}
          </div>
        </Group>

        <Group title="Günlük hedef" note="Sağdaki halka bu hedefe göre dolar.">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {GOALS.map((g) => (
              <Option
                key={g.value}
                selected={profile.daily_goal === g.value}
                label={g.label}
                hint={g.hint}
                onClick={() => void setDailyGoal(g.value)}
              />
            ))}
          </div>
        </Group>

        <PronunciationGroup />
      </div>
    </div>
  );
}

/* Pronunciation. The audio comes from Google Translate and needs a connection;
   the macOS system voices were dropped entirely for sounding too synthetic (see
   lib/audio.ts). What remains is the rate control and a test button. */
function PronunciationGroup() {
  const [rate, setRateState] = useState<number>(storedRate());
  /* We say nothing on a successful test - the audio itself is the feedback.
     A warning is shown only when it fails to play. */
  const [failed, setFailed] = useState(false);

  return (
    <Group title="Telaffuz" note="Kelime ve cümleler Google'ın sesiyle okunur — internet gerekir.">
      <label style={{ display: 'grid', gap: 8, marginBottom: 16 }}>
        <span style={{ fontWeight: 800, fontSize: 'var(--t-small)' }}>
          Konuşma hızı · {rate.toFixed(2)}×
        </span>
        <input
          type="range"
          min={0.6}
          max={1.15}
          step={0.01}
          value={rate}
          onChange={(e) => {
            const r = Number(e.target.value);
            setRateState(r);
            setRate(r);
          }}
          style={{ accentColor: 'var(--brand)' }}
        />
      </label>

      <button
        className="btn btn--sky"
        onClick={() => {
          void speak('Good morning. How are you today?').then((ok) => setFailed(!ok));
        }}
      >
        <Speaker size={18} /> Sesi dene
      </button>
      {failed && (
        <p style={{ color: 'var(--ink-2)', fontWeight: 700, fontSize: 'var(--t-small)', margin: '10px 0 0' }}>
          Ses çalınamadı — internet bağlantını kontrol et.
        </p>
      )}
    </Group>
  );
}

function Group({ title, note, children }: { title: string; note: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 32 }}>
      <h2 style={{ fontSize: 'var(--t-lead)' }}>{title}</h2>
      <p style={{ color: 'var(--ink-2)', fontWeight: 700, fontSize: 'var(--t-small)', margin: '4px 0 14px' }}>{note}</p>
      {children}
    </section>
  );
}

function Option({
  selected,
  label,
  hint,
  onClick,
  children,
}: {
  selected: boolean;
  label: string;
  hint: string;
  onClick: () => void;
  children?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={selected}
      style={{
        textAlign: 'left',
        padding: 14,
        borderRadius: 'var(--r-lg)',
        border: `2px solid ${selected ? 'var(--brand)' : 'var(--line)'}`,
        borderBottomWidth: 4,
        background: selected ? 'var(--brand-wash)' : 'var(--surface)',
        color: 'var(--ink)',
        display: 'grid',
        gap: 10,
      }}
    >
      {children}
      <div>
        <div style={{ fontWeight: 900, color: selected ? 'var(--brand-text)' : 'var(--ink)' }}>{label}</div>
        <div style={{ color: 'var(--ink-2)', fontWeight: 700, fontSize: 'var(--t-tiny)' }}>{hint}</div>
      </div>
    </button>
  );
}

/* Showing the options rather than naming them reads faster: each tile draws
   that theme's background/surface/brand trio as a miniature window. The colors
   are hard-coded rather than taken from the tokens - the "system" option has to
   show both at once. */
function ThemeSwatch({ value }: { value: Theme }) {
  const light = { bg: '#f6f5f8', surface: '#ffffff', line: '#e7e5ec', brand: '#7b3ba0' };
  const dark = { bg: '#15131b', surface: '#1e1b26', line: '#332e3f', brand: '#9c51c8' };
  const halves = value === 'system' ? [light, dark] : [value === 'dark' ? dark : light];

  return (
    <div style={{ display: 'flex', height: 54, borderRadius: 'var(--r-md)', overflow: 'hidden', border: '1px solid var(--line)' }}>
      {halves.map((c, i) => (
        <div key={i} style={{ flex: 1, background: c.bg, padding: 6, display: 'grid', gap: 4, alignContent: 'start' }}>
          <div style={{ height: 8, borderRadius: 3, background: c.brand }} />
          <div style={{ height: 6, borderRadius: 3, background: c.surface, border: `1px solid ${c.line}` }} />
          <div style={{ height: 6, width: '70%', borderRadius: 3, background: c.surface, border: `1px solid ${c.line}` }} />
        </div>
      ))}
    </div>
  );
}
