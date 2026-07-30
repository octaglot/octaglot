import { mulberry32 } from './rand';

/* Günlük görevler. Rastgelelik çalışma anında değil günün anahtarından türeyen
   tohumdan geliyor: uygulama gün içinde kapanıp açılınca aynı üç görev çıksın,
   kullanıcı elindeki görevi kaybetmesin. */

export type QuestKind = 'xp' | 'lessons' | 'combo' | 'storm' | 'review';

export type Quest = {
  idx: number;
  kind: QuestKind;
  target: number;
  progress: number;
  claimed: boolean;
};

export const QUEST_COUNT = 3;
export const QUEST_REWARD = 10; // görev başına elmas
export const QUEST_BONUS = 15; // üçü birden bitince

const KINDS: QuestKind[] = ['xp', 'lessons', 'combo', 'storm', 'review'];

const TARGETS: Record<QuestKind, number[]> = {
  xp: [30, 50, 80],
  lessons: [2, 3, 4],
  combo: [5, 8, 12],
  storm: [200, 350, 500],
  review: [10, 15, 20],
};

/* combo ve storm bir turun en iyisini ölçer, ötekiler gün boyu birikir. */
const PEAK: QuestKind[] = ['combo', 'storm'];

function seedFrom(day: string): number {
  // FNV-1a; tarih dizesi kısa, çakışma derdi yok.
  let h = 2166136261;
  for (let i = 0; i < day.length; i++) {
    h ^= day.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function dailyQuests(day: string): { idx: number; kind: QuestKind; target: number }[] {
  const rnd = mulberry32(seedFrom(day));
  const bag = [...KINDS];
  const out: { idx: number; kind: QuestKind; target: number }[] = [];

  for (let i = 0; i < QUEST_COUNT; i++) {
    const kind = bag.splice(Math.floor(rnd() * bag.length), 1)[0];
    const options = TARGETS[kind];
    out.push({ idx: i, kind, target: options[Math.floor(rnd() * options.length)] });
  }
  return out;
}

export function nextProgress(kind: QuestKind, current: number, n: number, target: number): number {
  const raw = PEAK.includes(kind) ? Math.max(current, n) : current + n;
  return Math.min(target, raw);
}

export function isComplete(q: Quest): boolean {
  return q.progress >= q.target;
}

export function questText(kind: QuestKind, target: number): string {
  switch (kind) {
    case 'xp':
      return `${target} XP kazan`;
    case 'lessons':
      return `${target} ders bitir`;
    case 'combo':
      return `Bir derste üst üste ${target} doğru`;
    case 'storm':
      return `Fırtınada ${target} puan`;
    case 'review':
      return `${target} kelime tekrar et`;
  }
}
