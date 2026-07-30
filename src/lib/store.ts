import { create } from 'zustand';
import {
  openUser,
  getUnits,
  getLessons,
  getStat,
  setStat,
  loadQuests,
  saveQuestProgress,
  saveQuestClaim,
  loadLegendary,
  saveLegendary,
} from './db';
import { stormXp } from './storm';
import { isComplete, nextProgress, QUEST_BONUS, QUEST_REWARD, type Quest, type QuestKind } from './quests';
import { isTauri } from './mock';
import type { Lesson, Unit } from './types';

const MAX_HEARTS = 5;
const HEART_REFILL_MIN = 30; // dakikada bir can geri gelir
const REFILL_COST = 50; // elmasla tam dolum
const LEGENDARY_COST = 30; // efsaneye giriş
const LEGENDARY_XP = 60; // efsane turu ödülü

const dayKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function daysBetween(a: string, b: string) {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86400000);
}

type Profile = {
  name: string;
  xp: number;
  gems: number;
  hearts: number;
  hearts_refilled_at: string | null;
  streak: number;
  last_active: string | null;
  daily_goal: number;
};

type State = {
  ready: boolean;
  units: Unit[];
  lessons: Lesson[];
  done: Map<number, { accuracy: number; times: number }>;
  todayXp: number;
  profile: Profile;
  /* Vadesi gelmiş tekrar kelimesi sayısı. Tekrar modunun kilitli mi açık mı
     olduğunu yan menünün bilmesi gerekiyor; her çizimde veritabanına sormamak
     için sayı burada tutulup ders bitiminde tazeleniyor. */
  dueCount: number;
  /* Fırtına: rekor ve bugünkü tur sayısı. Tur sayısı XP tavanı için gerekiyor,
     her turda veritabanına sormamak için burada tutuluyor. */
  stormBest: number;
  stormRunsToday: number;
  /* Bitmiş derslerin kelime sayısı — fırtına havuzunun büyüklüğü, kilit koşulu. */
  learnedWordCount: number;
  /* Bugünün üç görevi. */
  quests: Quest[];
  /* Efsane seviyesi geçilmiş ders kimlikleri. */
  legendary: Set<number>;

  init: () => Promise<void>;
  addXp: (n: number) => Promise<void>;
  loseHeart: () => Promise<void>;
  refillHearts: (withGems: boolean) => Promise<boolean>;
  completeLesson: (lessonId: number, accuracy: number, xp: number) => Promise<void>;
  /* Girişte elmas düşer; tur başarısız bitse de geri gelmez — bahsin anlamı bu.
     Elmas yetmezse false döner, çağıran uyarır. */
  startLegendary: () => Promise<boolean>;
  completeLegendary: (lessonId: number) => Promise<void>;
  reviewWord: (wordId: number, correct: boolean) => Promise<void>;
  recordStorm: (score: number) => Promise<number>;
  bumpQuest: (kind: QuestKind, n: number) => Promise<void>;
  claimQuest: (idx: number) => Promise<void>;
  dueWordIds: (limit: number) => Promise<number[]>;
  refreshDue: () => Promise<void>;
  setName: (name: string) => Promise<void>;
  setDailyGoal: (goal: number) => Promise<void>;
};

const blank: Profile = {
  name: 'Öğrenci',
  xp: 0,
  gems: 20,
  hearts: MAX_HEARTS,
  hearts_refilled_at: null,
  streak: 0,
  last_active: null,
  daily_goal: 50,
};

export const useGame = create<State>((set, get) => ({
  ready: false,
  units: [],
  lessons: [],
  done: new Map(),
  todayXp: 0,
  dueCount: 0,
  stormBest: 0,
  stormRunsToday: 0,
  learnedWordCount: 0,
  quests: [],
  legendary: new Set(),
  profile: blank,

  async init() {
    const [units, lessons] = await Promise.all([getUnits(), getLessons()]);

    // Tarayıcıda kalıcı depolama yok — tasarımı gözden geçirmek için yeterli.
    if (!isTauri) {
      const quests = await loadQuests(dayKey());
      set({ ready: true, units, lessons, done: new Map(), profile: blank, todayXp: 0, quests });
      return;
    }

    const db = await openUser();

    const rows = await db.select<Profile[]>('SELECT * FROM profile WHERE id = 1');
    let p = { ...blank, ...rows[0] };

    // Seri (streak) kontrolü: dün oynadıysa devam, daha eskiyse sıfırlanır.
    const today = dayKey();
    if (p.last_active) {
      const gap = daysBetween(p.last_active, today);
      if (gap > 1) {
        p.streak = 0;
        await db.execute('UPDATE profile SET streak = 0 WHERE id = 1');
      }
    }

    // Canlar zamanla geri gelir.
    if (p.hearts < MAX_HEARTS && p.hearts_refilled_at) {
      const mins = (Date.now() - new Date(p.hearts_refilled_at).getTime()) / 60000;
      const gained = Math.floor(mins / HEART_REFILL_MIN);
      if (gained > 0) {
        p.hearts = Math.min(MAX_HEARTS, p.hearts + gained);
        p.hearts_refilled_at = p.hearts >= MAX_HEARTS ? null : new Date().toISOString();
        await db.execute('UPDATE profile SET hearts = $1, hearts_refilled_at = $2 WHERE id = 1', [
          p.hearts,
          p.hearts_refilled_at,
        ]);
      }
    }

    const prog = await db.select<{ lesson_id: number; best_accuracy: number; times_done: number }[]>(
      'SELECT lesson_id, best_accuracy, times_done FROM progress',
    );
    const done = new Map(prog.map((r) => [r.lesson_id, { accuracy: r.best_accuracy, times: r.times_done }]));

    const xpToday = await db.select<{ s: number | null }[]>(
      'SELECT SUM(amount) AS s FROM xp_log WHERE day = $1',
      [today],
    );

    const [stormBest, stormRunsToday] = await Promise.all([getStat('storm_best'), getStat(`storm_runs_${today}`)]);

    /* Bitmiş derslerin kelime sayısı lessons tablosundaki word_count'tan
       toplanıyor — içerik veritabanına ikinci bir sorgu atmaya gerek yok. */
    const learnedWordCount = lessons.filter((l) => done.has(l.id)).reduce((n, l) => n + l.word_count, 0);

    const [quests, legendaryIds] = await Promise.all([loadQuests(today), loadLegendary()]);

    set({
      ready: true,
      units,
      lessons,
      done,
      profile: p,
      todayXp: xpToday[0]?.s ?? 0,
      stormBest,
      stormRunsToday,
      learnedWordCount,
      quests,
      legendary: new Set(legendaryIds),
    });
    await get().refreshDue();
  },

  async addXp(n) {
    const today = dayKey();
    const p = get().profile;
    const xp = p.xp + n;

    // İlk XP günü seriyi ilerletir.
    let streak = p.streak;
    if (p.last_active !== today) {
      streak = p.last_active && daysBetween(p.last_active, today) === 1 ? p.streak + 1 : 1;
    }

    if (isTauri) {
      const db = await openUser();
      await db.execute('INSERT INTO xp_log (day, amount) VALUES ($1, $2)', [today, n]);
      await db.execute('UPDATE profile SET xp = $1, streak = $2, last_active = $3 WHERE id = 1', [xp, streak, today]);
    }
    set({ profile: { ...p, xp, streak, last_active: today }, todayXp: get().todayXp + n });
    await get().bumpQuest('xp', n);
  },

  async loseHeart() {
    const p = get().profile;
    const hearts = Math.max(0, p.hearts - 1);
    const stamp = p.hearts_refilled_at ?? new Date().toISOString();
    if (isTauri) {
      const db = await openUser();
      await db.execute('UPDATE profile SET hearts = $1, hearts_refilled_at = $2 WHERE id = 1', [hearts, stamp]);
    }
    set({ profile: { ...p, hearts, hearts_refilled_at: stamp } });
  },

  async refillHearts(withGems) {
    const p = get().profile;
    if (withGems && p.gems < REFILL_COST) return false;
    const gems = withGems ? p.gems - REFILL_COST : p.gems;
    if (isTauri) {
      const db = await openUser();
      await db.execute('UPDATE profile SET hearts = $1, gems = $2, hearts_refilled_at = NULL WHERE id = 1', [
        MAX_HEARTS,
        gems,
      ]);
    }
    set({ profile: { ...p, hearts: MAX_HEARTS, gems, hearts_refilled_at: null } });
    return true;
  },

  async completeLesson(lessonId, accuracy, xp) {
    if (isTauri) {
      const db = await openUser();
      await db.execute(
        `INSERT INTO progress (lesson_id, completed_at, best_accuracy, times_done)
         VALUES ($1, $2, $3, 1)
         ON CONFLICT(lesson_id) DO UPDATE SET
           completed_at = excluded.completed_at,
           best_accuracy = MAX(progress.best_accuracy, excluded.best_accuracy),
           times_done = progress.times_done + 1`,
        [lessonId, new Date().toISOString(), accuracy],
      );
    }
    const prev = get().done.get(lessonId);
    const done = new Map(get().done);
    done.set(lessonId, {
      accuracy: Math.max(prev?.accuracy ?? 0, accuracy),
      times: (prev?.times ?? 0) + 1,
    });
    set({ done });

    /* Ders ilk kez bitiyorsa kelimeleri fırtına havuzuna katılır. */
    if (!prev) {
      const lesson = get().lessons.find((l) => l.id === lessonId);
      if (lesson) set({ learnedWordCount: get().learnedWordCount + lesson.word_count });
    }

    // Ders bitişinde elmas ödülü — mükemmel derse ekstra.
    const bonus = accuracy === 1 ? 3 : 1;
    const p = get().profile;
    if (isTauri) {
      const db = await openUser();
      await db.execute('UPDATE profile SET gems = $1 WHERE id = 1', [p.gems + bonus]);
    }
    set({ profile: { ...get().profile, gems: p.gems + bonus } });

    await get().addXp(xp);
    await get().refreshDue();
    await get().bumpQuest('lessons', 1);
  },

  async startLegendary() {
    const p = get().profile;
    if (p.gems < LEGENDARY_COST) return false;
    const gems = p.gems - LEGENDARY_COST;
    if (isTauri) {
      const db = await openUser();
      await db.execute('UPDATE profile SET gems = $1 WHERE id = 1', [gems]);
    }
    set({ profile: { ...p, gems } });
    return true;
  },

  async completeLegendary(lessonId) {
    await saveLegendary(lessonId);
    const legendary = new Set(get().legendary);
    legendary.add(lessonId);
    set({ legendary });
    await get().addXp(LEGENDARY_XP);
  },

  /* Görev ilerlemesinin tek kapısı. Her olay kaynağı (XP, ders, tekrar,
     fırtına) buradan geçer; sayma kuralı `quests.ts`'te durur. */
  async bumpQuest(kind, n) {
    const day = dayKey();
    const quests = get().quests;
    if (!quests.length || n <= 0) return;

    const updated = await Promise.all(
      quests.map(async (q) => {
        if (q.kind !== kind || isComplete(q)) return q;
        const progress = nextProgress(q.kind, q.progress, n, q.target);
        if (progress === q.progress) return q;
        await saveQuestProgress(day, q.idx, progress);
        return { ...q, progress };
      }),
    );
    set({ quests: updated });
  },

  async claimQuest(idx) {
    const q = get().quests.find((x) => x.idx === idx);
    if (!q || !isComplete(q) || q.claimed) return;

    const rest = get().quests.map((x) => (x.idx === idx ? { ...x, claimed: true } : x));
    // Üçü de alındıysa bonus. Kontrol güncel listeye göre yapılıyor.
    const all = rest.every((x) => x.claimed);
    const gems = get().profile.gems + QUEST_REWARD + (all ? QUEST_BONUS : 0);

    await saveQuestClaim(dayKey(), idx, new Date().toISOString());
    if (isTauri) {
      const db = await openUser();
      await db.execute('UPDATE profile SET gems = $1 WHERE id = 1', [gems]);
    }
    set({ quests: rest, profile: { ...get().profile, gems } });
  },

  /* Fırtına turu sonu: XP yaz, rekoru güncelle, günün tur sayacını artır.
     Kazanılan XP döner — sonuç ekranı onu göstersin diye. */
  async recordStorm(score) {
    const today = dayKey();
    const runs = get().stormRunsToday;
    const xp = stormXp(score, runs);
    const best = Math.max(get().stormBest, score);

    await Promise.all([setStat('storm_best', best), setStat(`storm_runs_${today}`, runs + 1)]);
    set({ stormBest: best, stormRunsToday: runs + 1 });
    await get().bumpQuest('storm', score);

    if (xp > 0) await get().addXp(xp);
    return xp;
  },

  /* Aralıklı tekrar: doğru bilinen kelime katlanarak uzar, yanlış olan başa döner.
     Erken dönüş yok: SRS yazımı Tauri'ye bağlı ama görev sayacı tarayıcı
     kipinde de işlemeli. */
  async reviewWord(wordId, correct) {
    if (isTauri) {
      const db = await openUser();
      const rows = await db.select<{ strength: number; lapses: number }[]>(
        'SELECT strength, lapses FROM srs WHERE word_id = $1',
        [wordId],
      );
      const cur = rows[0];
      const strength = correct ? Math.min(8, (cur?.strength ?? 0) + 1) : 0;
      const lapses = (cur?.lapses ?? 0) + (correct ? 0 : 1);
      const days = correct ? Math.pow(2, strength - 1) : 0;
      const due = new Date(Date.now() + days * 86400000).toISOString();
      await db.execute(
        `INSERT INTO srs (word_id, strength, due, lapses) VALUES ($1, $2, $3, $4)
         ON CONFLICT(word_id) DO UPDATE SET strength = excluded.strength, due = excluded.due, lapses = excluded.lapses`,
        [wordId, strength, due, lapses],
      );
    }
    await get().bumpQuest('review', 1);
  },

  async refreshDue() {
    if (!isTauri) return set({ dueCount: 0 });
    const db = await openUser();
    const rows = await db.select<{ n: number }[]>(
      'SELECT COUNT(*) AS n FROM srs WHERE due <= $1',
      [new Date().toISOString()],
    );
    set({ dueCount: rows[0]?.n ?? 0 });
  },

  async dueWordIds(limit) {
    if (!isTauri) return [];
    const db = await openUser();
    const rows = await db.select<{ word_id: number }[]>(
      'SELECT word_id FROM srs WHERE due <= $1 ORDER BY due LIMIT $2',
      [new Date().toISOString(), limit],
    );
    return rows.map((r) => r.word_id);
  },

  async setName(name) {
    if (isTauri) {
      const db = await openUser();
      await db.execute('UPDATE profile SET name = $1 WHERE id = 1', [name]);
    }
    set({ profile: { ...get().profile, name } });
  },

  async setDailyGoal(goal) {
    if (isTauri) {
      const db = await openUser();
      await db.execute('UPDATE profile SET daily_goal = $1 WHERE id = 1', [goal]);
    }
    set({ profile: { ...get().profile, daily_goal: goal } });
  },
}));

export { MAX_HEARTS, REFILL_COST, LEGENDARY_COST, LEGENDARY_XP, dayKey };
