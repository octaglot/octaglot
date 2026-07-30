import Database from '@tauri-apps/plugin-sql';
import { invoke } from '@tauri-apps/api/core';
import { isTauri, mockContent } from './mock';
import { dailyQuests, type Quest } from './quests';
import type { Lesson, Sentence, Unit, Word } from './types';

let contentDb: Database | null = null;
let userDb: Database | null = null;

/* İçerik veritabanı uygulamayla paketlenir ve Rust tarafı onu yazılabilir
   dizine kopyalar; kullanıcı veritabanı ilk açılışta orada oluşturulur.
   İkisini ayrı tutmanın sebebi: içerik güncellenince ilerleme silinmesin. */

export async function openContent(): Promise<Database> {
  if (contentDb) return contentDb;
  const path = await invoke<string>('content_db_path');
  contentDb = await Database.load(`sqlite:${path}`);
  return contentDb;
}

export async function openUser(): Promise<Database> {
  if (userDb) return userDb;
  userDb = await Database.load('sqlite:user.db');
  await userDb.execute(`
    CREATE TABLE IF NOT EXISTS profile (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      name TEXT NOT NULL DEFAULT 'Öğrenci',
      xp INTEGER NOT NULL DEFAULT 0,
      gems INTEGER NOT NULL DEFAULT 20,
      hearts INTEGER NOT NULL DEFAULT 5,
      hearts_refilled_at TEXT,
      streak INTEGER NOT NULL DEFAULT 0,
      last_active TEXT,
      daily_goal INTEGER NOT NULL DEFAULT 50
    );
    INSERT OR IGNORE INTO profile (id) VALUES (1);

    CREATE TABLE IF NOT EXISTS progress (
      lesson_id INTEGER PRIMARY KEY,
      completed_at TEXT NOT NULL,
      best_accuracy REAL NOT NULL DEFAULT 0,
      times_done INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS xp_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      day TEXT NOT NULL,
      amount INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_xp_day ON xp_log(day);

    -- Aralıklı tekrar: her kelimenin bir sonraki gösterim tarihi.
    CREATE TABLE IF NOT EXISTS srs (
      word_id INTEGER PRIMARY KEY,
      strength INTEGER NOT NULL DEFAULT 0,
      due TEXT NOT NULL,
      lapses INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_srs_due ON srs(due);

    -- Sayısal kayıtlar (fırtına rekoru, günlük tur sayısı). Profil şeması
    -- sabit kalsın diye ayrı tablo: profile'a kolon eklemek göç gerektirirdi.
    CREATE TABLE IF NOT EXISTS stats (
      key TEXT PRIMARY KEY,
      value INTEGER NOT NULL DEFAULT 0
    );

    -- Günlük görevler. Geçmiş günler silinmiyor: ileride takvim/rozet için veri.
    CREATE TABLE IF NOT EXISTS quests (
      day TEXT NOT NULL,
      idx INTEGER NOT NULL,
      kind TEXT NOT NULL,
      target INTEGER NOT NULL,
      progress INTEGER NOT NULL DEFAULT 0,
      claimed_at TEXT,
      PRIMARY KEY (day, idx)
    );
  `);
  return userDb;
}

/* ---------------- içerik sorguları ---------------- */

export async function getUnits(): Promise<Unit[]> {
  if (!isTauri) return mockContent.units();
  const db = await openContent();
  return db.select<Unit[]>('SELECT * FROM units ORDER BY id');
}

export async function getLessons(): Promise<Lesson[]> {
  if (!isTauri) return mockContent.lessons();
  const db = await openContent();
  return db.select<Lesson[]>('SELECT * FROM lessons ORDER BY unit_id, idx');
}

export async function getLessonWords(lessonId: number): Promise<Word[]> {
  if (!isTauri) return mockContent.lessonWords(lessonId);
  const db = await openContent();
  return db.select<Word[]>('SELECT * FROM words WHERE lesson_id = $1 ORDER BY id', [lessonId]);
}

export async function getLessonSentences(lessonId: number): Promise<Sentence[]> {
  if (!isTauri) return mockContent.lessonSentences(lessonId);
  const db = await openContent();
  return db.select<Sentence[]>('SELECT * FROM sentences WHERE lesson_id = $1 ORDER BY n, id', [lessonId]);
}

/* Şıkların inandırıcı olması için çeldiriciler aynı üniteden seçilir. */
export async function getDistractorWords(unitId: number, exclude: number[], limit = 12): Promise<Word[]> {
  if (!isTauri) return mockContent.distractors(unitId, exclude, limit);
  const db = await openContent();
  const holes = exclude.map((_, i) => `$${i + 3}`).join(',') || '-1';
  return db.select<Word[]>(
    `SELECT * FROM words
     WHERE unit_id <= $1 AND id NOT IN (${holes})
     ORDER BY abs(unit_id - $1), RANDOM() LIMIT $2`,
    [unitId, limit, ...exclude],
  );
}

export async function getWordsByIds(ids: number[]): Promise<Word[]> {
  if (!ids.length) return [];
  if (!isTauri) return mockContent.byIds(ids);
  const db = await openContent();
  const holes = ids.map((_, i) => `$${i + 1}`).join(',');
  return db.select<Word[]>(`SELECT * FROM words WHERE id IN (${holes})`, ids);
}

/* ---------------- kullanıcı sayaçları ---------------- */

export async function getStat(key: string): Promise<number> {
  if (!isTauri) return 0;
  const db = await openUser();
  const rows = await db.select<{ value: number }[]>('SELECT value FROM stats WHERE key = $1', [key]);
  return rows[0]?.value ?? 0;
}

export async function setStat(key: string, value: number): Promise<void> {
  if (!isTauri) return;
  const db = await openUser();
  await db.execute(
    `INSERT INTO stats (key, value) VALUES ($1, $2)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [key, value],
  );
}

/* Fırtına havuzu: bitmiş derslerin bütün kelimeleri. */
export async function getWordsByLessons(lessonIds: number[]): Promise<Word[]> {
  if (!lessonIds.length) return [];
  if (!isTauri) return mockContent.byLessons(lessonIds);
  const db = await openContent();
  const holes = lessonIds.map((_, i) => `$${i + 1}`).join(',');
  return db.select<Word[]>(`SELECT * FROM words WHERE lesson_id IN (${holes})`, lessonIds);
}

/* ---------------- günlük görevler ---------------- */

/* Günün görevleri ilk çağrıda yazılır, sonra tablodan okunur. Üretim tohumlu
   olduğu için yazma anı önemli değil — aynı gün hep aynı üçlü çıkar. */
export async function loadQuests(day: string): Promise<Quest[]> {
  const planned = dailyQuests(day);
  if (!isTauri) return planned.map((q) => ({ ...q, progress: 0, claimed: false }));

  const db = await openUser();
  for (const q of planned) {
    await db.execute('INSERT OR IGNORE INTO quests (day, idx, kind, target) VALUES ($1, $2, $3, $4)', [
      day,
      q.idx,
      q.kind,
      q.target,
    ]);
  }
  const rows = await db.select<
    { idx: number; kind: string; target: number; progress: number; claimed_at: string | null }[]
  >('SELECT idx, kind, target, progress, claimed_at FROM quests WHERE day = $1 ORDER BY idx', [day]);

  return rows.map((r) => ({
    idx: r.idx,
    kind: r.kind as Quest['kind'],
    target: r.target,
    progress: r.progress,
    claimed: r.claimed_at !== null,
  }));
}

export async function saveQuestProgress(day: string, idx: number, progress: number): Promise<void> {
  if (!isTauri) return;
  const db = await openUser();
  await db.execute('UPDATE quests SET progress = $1 WHERE day = $2 AND idx = $3', [progress, day, idx]);
}

export async function saveQuestClaim(day: string, idx: number, at: string): Promise<void> {
  if (!isTauri) return;
  const db = await openUser();
  await db.execute('UPDATE quests SET claimed_at = $1 WHERE day = $2 AND idx = $3', [at, day, idx]);
}

export async function getUnitWordCount(unitId: number): Promise<number> {
  const db = await openContent();
  const r = await db.select<{ c: number }[]>('SELECT COUNT(*) AS c FROM words WHERE unit_id = $1', [unitId]);
  return r[0]?.c ?? 0;
}
