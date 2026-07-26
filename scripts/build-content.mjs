#!/usr/bin/env node
// Cıvıl içerik derleyicisi.
// Tatoeba cümle çiftleri + frekans listesi + FreeDict sözlüğünden kademeli
// (i+1) bir müfredat üretip data/content.db dosyasına yazar.
//
// Kademelendirme kuralı: bir cümle ancak TÜM kelimeleri o ana kadar öğretilmiş
// kelime havuzunda ise derse girer. Böylece zorluk kendiliğinden artar.

import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { UNITS, CONFIG, CEFR_BANDS, BLOCKLIST, INFLECTED, OVERRIDES } from './curriculum.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const RAW = join(ROOT, 'data', 'raw');
const OUT_DIR = join(ROOT, 'src-tauri', 'resources');
const OUT_DB = join(OUT_DIR, 'content.db');
const CANDIDATES = join(ROOT, 'data', 'candidates.json');
const GLOSSES = join(ROOT, 'data', 'glosses.json');

// İki aşamalı çalışır:
//   --candidates → aday kelime listesini yazar (fetch-glosses.mjs bunu okur)
//   (bayraksız)  → glosses.json'u kullanarak content.db üretir
const STAGE_CANDIDATES = process.argv.includes('--candidates');

const log = (...a) => console.log('·', ...a);

/* ------------------------------------------------------------------ */
/* Dilbilgisi yardımcıları                                            */
/* ------------------------------------------------------------------ */

// Çekim eklerini soyup köke inmeyi dener. Basit ama Tatoeba için yeterli.
function* stemCandidates(w) {
  yield w;
  if (w.includes("'")) yield w.split("'")[0];
  if (w.endsWith('s') && !w.endsWith('ss')) yield w.slice(0, -1);
  if (w.endsWith('es')) yield w.slice(0, -2);
  if (w.endsWith('ies')) yield w.slice(0, -3) + 'y';
  if (w.endsWith('ed')) {
    yield w.slice(0, -2);
    yield w.slice(0, -1);
    if (w.length > 4 && w[w.length - 3] === w[w.length - 4]) yield w.slice(0, -3);
  }
  if (w.endsWith('ing')) {
    yield w.slice(0, -3);
    yield w.slice(0, -3) + 'e';
    if (w.length > 5 && w[w.length - 4] === w[w.length - 5]) yield w.slice(0, -4);
  }
  if (w.endsWith('er')) yield w.slice(0, -2);
  if (w.endsWith('est')) yield w.slice(0, -3);
  if (w.endsWith('ly')) yield w.slice(0, -2);
}

// Her zaman "bilinen" sayılan işlev kelimeleri ve Tatoeba'nın standart isimleri.
// Bunlar ünitelerde ayrıca öğretilir ama cümle filtresini kilitlememeleri gerekir.
const BASE = new Set(`
a an the and or but if so because that this these those there here
i you he she it we they me him her us them my your his its our their mine yours
am is are was were be been being do does did don't doesn't didn't
have has had haven't hasn't hadn't will won't would wouldn't can can't could couldn't
should shouldn't may might must not no yes very too also just only even still
of in on at to for from with by about into over under after before between
what who whom whose where when why how which
one two some any all both each every other another same
i'm you're he's she's it's we're they're i've you've i'll you'll it'll
isn't aren't wasn't weren't let's
tom mary john ken bob jim mike nancy alice bill jack tom's mary's
`.trim().split(/\s+/));

/* ------------------------------------------------------------------ */
/* 1. Frekans listesi                                                  */
/* ------------------------------------------------------------------ */

log('frekans listesi okunuyor…');
const rank = new Map();
{
  const lines = readFileSync(join(RAW, 'en_50k.txt'), 'utf8').split('\n');
  let r = 0;
  for (const line of lines) {
    const w = line.split(' ')[0];
    if (!w || !/^[a-z][a-z']*$/.test(w)) continue;
    if (!rank.has(w)) rank.set(w, ++r);
  }
}
log(`  ${rank.size} kelime sıralandı`);

/* ------------------------------------------------------------------ */
/* 2. FreeDict eng-tur sözlüğü (TEI)                                   */
/* ------------------------------------------------------------------ */

log('sözlük ayrıştırılıyor…');

// FreeDict girdileri tek bir <quote> içine deyimleri de tıkıştırıyor:
//   "elma. apple blossom elma baharı. apple butter elma marmelâdı. …"
// İlk cümleden sonrası deyim listesidir; kesip atıyoruz.
// "akçakavak (bot.) Populus alba." → "akçakavak"
function cleanGloss(raw) {
  let s = raw
    .split(/\.\s/)[0]
    .replace(/&[a-z]+;/g, ' ')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const parts = s.split(/[,;/]/).map((p) => p.trim()).filter(Boolean);
  const good = [];
  for (let p of parts) {
    p = p.replace(/\.$/, '').trim();
    // Latince binom adlarını ve tuhaf uzun açıklamaları at
    if (/^[A-ZÇĞİÖŞÜ][a-zçğıöşü]+ [a-zçğıöşü]+$/.test(p)) continue;
    if (p.length < 2 || p.length > 28) continue;
    if (/[0-9<>=]/.test(p)) continue;
    good.push(p);
    if (good.length === 2) break;
  }
  return good.join(', ');
}

const dict = new Map(); // en → { tr, pos }

// Birincil kaynak: Wiktionary (kaikki.org) çeviri bölümleri — küratörlü ve temiz.
if (!STAGE_CANDIDATES && existsSync(GLOSSES)) {
  const g = JSON.parse(readFileSync(GLOSSES, 'utf8'));
  for (const [en, v] of Object.entries(g)) {
    if (v && v.tr) dict.set(en, { tr: v.tr, alts: v.alts || [], pos: v.pos || '' });
  }
  log(`  ${dict.size} Wiktionary girdisi`);
}

// Yedek kaynak: FreeDict eng-tur — Wiktionary'de karşılığı olmayanlar için.
{
  const tei = readFileSync(join(RAW, 'eng-tur', 'eng-tur.tei'), 'utf8');
  const entryRe = /<entry>([\s\S]*?)<\/entry>/g;
  const orthRe = /<orth>([^<]*)<\/orth>/;
  const posRe = /<pos>([^<]*)<\/pos>/;
  const quoteRe = /<quote>([^<]*)<\/quote>/g;
  let m;
  while ((m = entryRe.exec(tei))) {
    const body = m[1];
    const om = orthRe.exec(body);
    if (!om) continue;
    const en = om[1].trim().toLowerCase();
    if (!/^[a-z][a-z']*$/.test(en)) continue;
    const glosses = [];
    let q;
    quoteRe.lastIndex = 0;
    while ((q = quoteRe.exec(body))) {
      const g = cleanGloss(q[1]);
      if (g) glosses.push(g);
      if (glosses.length === 3) break;
    }
    if (!glosses.length) continue;
    const pos = (posRe.exec(body)?.[1] || '').trim();
    if (!dict.has(en)) dict.set(en, { tr: glosses.join('; ').slice(0, 60), pos });
  }
}
log(`  ${dict.size} sözlük girdisi`);

/* ------------------------------------------------------------------ */
/* 3. Tatoeba cümle çiftleri                                           */
/* ------------------------------------------------------------------ */

log('bağlantılar okunuyor…');
const trToEn = new Map();
{
  const buf = readFileSync(join(RAW, 'tur-eng_links.tsv'), 'utf8');
  let i = 0;
  while (i < buf.length) {
    const nl = buf.indexOf('\n', i);
    const line = buf.slice(i, nl === -1 ? buf.length : nl);
    i = nl === -1 ? buf.length : nl + 1;
    const tab = line.indexOf('\t');
    if (tab === -1) continue;
    const a = line.slice(0, tab);
    const b = line.slice(tab + 1).trim();
    if (!trToEn.has(a)) trToEn.set(a, b);
  }
}
log(`  ${trToEn.size} bağlantı`);

function readSentences(file, wanted) {
  const map = new Map();
  const buf = readFileSync(join(RAW, file), 'utf8');
  let i = 0;
  while (i < buf.length) {
    const nl = buf.indexOf('\n', i);
    const line = buf.slice(i, nl === -1 ? buf.length : nl);
    i = nl === -1 ? buf.length : nl + 1;
    const t1 = line.indexOf('\t');
    if (t1 === -1) continue;
    const id = line.slice(0, t1);
    if (wanted && !wanted.has(id)) continue;
    const t2 = line.indexOf('\t', t1 + 1);
    if (t2 === -1) continue;
    map.set(id, line.slice(t2 + 1).trim());
  }
  return map;
}

log('türkçe cümleler okunuyor…');
const turIds = new Set(trToEn.keys());
const turText = readSentences('tur_sentences.tsv', turIds);
log(`  ${turText.size}`);

log('ingilizce cümleler okunuyor…');
const engIds = new Set(trToEn.values());
const engText = readSentences('eng_sentences.tsv', engIds);
log(`  ${engText.size}`);

/* ------------------------------------------------------------------ */
/* 4. Çiftleri temizle ve tokenize et                                  */
/* ------------------------------------------------------------------ */

const APOS = /[’ʼ]/g;

function tokenize(en) {
  return en
    .toLowerCase()
    .replace(APOS, "'")
    .replace(/[^a-z' ]+/g, ' ')
    .split(/\s+/)
    .map((t) => t.replace(/^'+|'+$/g, ''))
    .filter(Boolean);
}

log('çiftler süzülüyor…');
const pairs = [];
const seenEn = new Set();
for (const [trId, enId] of trToEn) {
  const en = engText.get(enId);
  const tr = turText.get(trId);
  if (!en || !tr) continue;

  if (!/^[A-Z"']/.test(en)) continue;
  if (!/[.!?]$/.test(en)) continue;
  if (/[0-9;:()\[\]<>*_=+@#$%^&|~`{}]/.test(en)) continue;
  if (/[0-9;:()\[\]<>*_=+@#$%^&|~`{}]/.test(tr)) continue;
  if (en.includes('"') || en.includes('--')) continue;
  if (tr.length < 3 || tr.length > 90) continue;

  const tokens = tokenize(en);
  if (tokens.length < CONFIG.minEnglishWords || tokens.length > CONFIG.maxEnglishWords) continue;

  const keyEn = en.toLowerCase();
  if (seenEn.has(keyEn)) continue;
  seenEn.add(keyEn);

  pairs.push({ en, tr, tokens, n: tokens.length });
}
turText.clear();
engText.clear();
trToEn.clear();
log(`  ${pairs.length} kullanılabilir çift`);

/* ------------------------------------------------------------------ */
/* 5. Kelime dağarcığını ünitelere böl                                 */
/* ------------------------------------------------------------------ */

log('kelime dağarcığı kuruluyor…');

// Cümlelerde gerçekten geçen kelimeleri say — sözlükte olup korpüste
// olmayan kelimeleri öğretmenin anlamı yok.
const corpusCount = new Map();
for (const p of pairs) {
  for (const t of p.tokens) corpusCount.set(t, (corpusCount.get(t) || 0) + 1);
}

// Elle yazılmış düzeltmeler her iki sözlüğün de önüne geçer.
for (const [en, tr] of Object.entries(OVERRIDES)) {
  dict.set(en, { tr, alts: dict.get(en)?.alts || [], pos: dict.get(en)?.pos || '' });
}

// Otomatik doldurmaya uygun mu? Çekirdek kelimeler bu süzgeçten muaftır —
// onları müfredat bilerek seçmiştir.
function usableForFill(w) {
  if (BLOCKLIST.has(w) || INFLECTED.has(w)) return false;
  const d = dict.get(w);
  if (!d) return false;
  if (Object.hasOwn(OVERRIDES, w)) return true;
  // FreeDict yedeğinden gelen çok anlamlı blobları ele.
  if (/[;()[\]]/.test(d.tr)) return false;
  if (d.tr.length > 24) return false;
  // "went → go", "children → child" gibi İngilizceye yönlendirmeleri ele.
  // Karşılığın kendisi sık bir İngilizce kelimeyse çeviri değildir.
  // (Not: "elma", "su" gibi ASCII Türkçe karşılıkları elemeyen tek güvenli test.)
  if (rank.has(d.tr)) return false;
  return true;
}

const used = new Set();
const cefrOf = (unitIdx) =>
  CEFR_BANDS.find((b) => unitIdx >= b.units[0] && unitIdx <= b.units[1])?.level || 'B1';

// Frekans sırasına göre, sözlükte karşılığı olan ve korpüste yeterince geçen
// kelimeleri sırayla veren bir üretici.
const freqOrdered = [...rank.entries()]
  .sort((a, b) => a[1] - b[1])
  .map(([w]) => w)
  .filter((w) => (corpusCount.get(w) || 0) >= 25 && (STAGE_CANDIDATES || dict.has(w)));

if (STAGE_CANDIDATES) {
  // Gereğinden fazla aday topla: bir kısmının Wiktionary'de Türkçe karşılığı
  // çıkmayacak, onları eleyip kalanla ilerleyeceğiz.
  const seeds = UNITS.flatMap((u) => u.seeds);
  const list = [...new Set([...seeds, ...freqOrdered.slice(0, 2400)])];
  mkdirSync(dirname(CANDIDATES), { recursive: true });
  writeFileSync(CANDIDATES, JSON.stringify(list, null, 0));
  log(`aday listesi yazıldı: ${list.length} kelime → ${CANDIDATES}`);
  process.exit(0);
}

if (!existsSync(GLOSSES)) {
  console.error('\n✗ data/glosses.json yok. Önce: npm run content:glosses\n');
  process.exit(1);
}

let freqCursor = 0;
function nextFreqWord() {
  while (freqCursor < freqOrdered.length) {
    const w = freqOrdered[freqCursor++];
    if (!used.has(w) && !BASE.has(w) && usableForFill(w)) return w;
  }
  return null;
}

const unitPlans = [];
for (let u = 0; u < UNITS.length; u++) {
  const def = UNITS[u];
  const words = [];

  for (const s of def.seeds) {
    if (used.has(s)) continue;
    if (!dict.has(s)) continue;
    if ((corpusCount.get(s) || 0) < 5) continue;
    used.add(s);
    words.push(s);
  }
  while (words.length < CONFIG.targetWordsPerUnit) {
    const w = nextFreqWord();
    if (!w) break;
    used.add(w);
    words.push(w);
  }

  unitPlans.push({
    idx: u + 1,
    title: def.title,
    subtitle: def.subtitle,
    icon: def.icon,
    cefr: cefrOf(u + 1),
    words,
  });
}
log(`  ${unitPlans.reduce((s, u) => s + u.words.length, 0)} kelime, ${unitPlans.length} ünite`);

/* ------------------------------------------------------------------ */
/* 6. Cümleleri derslere dağıt                                         */
/* ------------------------------------------------------------------ */

log('cümleler derslere dağıtılıyor…');

const known = new Set(BASE);
const takenSentences = new Set();

// Bir token biliniyor mu? Çekim eklerini soyarak dener.
function isKnown(tok) {
  for (const c of stemCandidates(tok)) if (known.has(c)) return true;
  return false;
}
function sentenceKnown(p) {
  for (const t of p.tokens) if (!isKnown(t)) return false;
  return true;
}
function hitsTargets(p, targets) {
  for (const t of p.tokens) {
    for (const c of stemCandidates(t)) if (targets.has(c)) return true;
  }
  return false;
}

// Kısa cümleler önce gelsin — erken üniteler daha kolay olsun.
pairs.sort((a, b) => a.n - b.n);

const lessons = [];
let lessonId = 0;

for (const unit of unitPlans) {
  const per = Math.ceil(unit.words.length / CONFIG.lessonsPerUnit);
  for (let l = 0; l < CONFIG.lessonsPerUnit; l++) {
    const slice = unit.words.slice(l * per, (l + 1) * per);
    if (!slice.length && l > 0) continue;

    for (const w of slice) known.add(w);
    const targets = new Set(slice);

    const strict = [];
    const loose = [];
    for (let i = 0; i < pairs.length; i++) {
      if (takenSentences.has(i)) continue;
      const p = pairs[i];
      if (!sentenceKnown(p)) continue;
      if (hitsTargets(p, targets)) {
        strict.push(i);
        if (strict.length >= CONFIG.maxSentencesPerLesson) break;
      } else if (loose.length < CONFIG.maxSentencesPerLesson) {
        loose.push(i);
      }
    }

    const chosen = strict.slice(0, CONFIG.maxSentencesPerLesson);
    for (const i of loose) {
      if (chosen.length >= CONFIG.minSentencesPerLesson) break;
      chosen.push(i);
    }
    for (const i of chosen) takenSentences.add(i);

    lessons.push({
      id: ++lessonId,
      unitIdx: unit.idx,
      idx: l + 1,
      words: slice,
      sentenceIdx: chosen,
    });
  }
}

const totalSent = lessons.reduce((s, l) => s + l.sentenceIdx.length, 0);
const thin = lessons.filter((l) => l.sentenceIdx.length < CONFIG.minSentencesPerLesson);
log(`  ${lessons.length} ders, ${totalSent} cümle`);
if (thin.length) {
  log(`  uyarı: ${thin.length} ders ${CONFIG.minSentencesPerLesson} cümlenin altında`);
  log(`  en zayıfı: ders ${thin[0].id} → ${thin[0].sentenceIdx.length} cümle`);
}

/* ------------------------------------------------------------------ */
/* 7. Veritabanını yaz                                                 */
/* ------------------------------------------------------------------ */

log('content.db yazılıyor…');
mkdirSync(OUT_DIR, { recursive: true });
if (existsSync(OUT_DB)) rmSync(OUT_DB);

const db = new DatabaseSync(OUT_DB);
db.exec(`
  PRAGMA journal_mode = DELETE;
  CREATE TABLE units (
    id INTEGER PRIMARY KEY, title TEXT NOT NULL, subtitle TEXT NOT NULL,
    icon TEXT NOT NULL, cefr TEXT NOT NULL
  );
  CREATE TABLE lessons (
    id INTEGER PRIMARY KEY, unit_id INTEGER NOT NULL, idx INTEGER NOT NULL,
    word_count INTEGER NOT NULL, sentence_count INTEGER NOT NULL
  );
  CREATE TABLE words (
    id INTEGER PRIMARY KEY, en TEXT NOT NULL, tr TEXT NOT NULL, alts TEXT,
    pos TEXT, unit_id INTEGER NOT NULL, lesson_id INTEGER NOT NULL, rank INTEGER
  );
  CREATE TABLE sentences (
    id INTEGER PRIMARY KEY, en TEXT NOT NULL, tr TEXT NOT NULL,
    tokens TEXT NOT NULL, n INTEGER NOT NULL,
    unit_id INTEGER NOT NULL, lesson_id INTEGER NOT NULL
  );
  CREATE INDEX idx_words_lesson ON words(lesson_id);
  CREATE INDEX idx_sent_lesson ON sentences(lesson_id);
  CREATE INDEX idx_lessons_unit ON lessons(unit_id);
`);

const insUnit = db.prepare('INSERT INTO units VALUES (?,?,?,?,?)');
const insLesson = db.prepare('INSERT INTO lessons VALUES (?,?,?,?,?)');
const insWord = db.prepare('INSERT INTO words VALUES (?,?,?,?,?,?,?,?)');
const insSent = db.prepare('INSERT INTO sentences VALUES (?,?,?,?,?,?,?)');

db.exec('BEGIN');
for (const u of unitPlans) insUnit.run(u.idx, u.title, u.subtitle, u.icon, u.cefr);

let wordId = 0;
let sentId = 0;
for (const l of lessons) {
  insLesson.run(l.id, l.unitIdx, l.idx, l.words.length, l.sentenceIdx.length);
  for (const w of l.words) {
    const d = dict.get(w);
    const alts = d.alts?.length ? d.alts.join('|') : null;
    insWord.run(++wordId, w, d.tr, alts, d.pos || null, l.unitIdx, l.id, rank.get(w) ?? null);
  }
  for (const i of l.sentenceIdx) {
    const p = pairs[i];
    insSent.run(++sentId, p.en, p.tr, p.tokens.join(' '), p.n, l.unitIdx, l.id);
  }
}
db.exec('COMMIT');
db.exec('VACUUM');

const stat = (q) => db.prepare(q).get();
log('bitti:', JSON.stringify(stat(`
  SELECT (SELECT COUNT(*) FROM units) AS uniteler,
         (SELECT COUNT(*) FROM lessons) AS dersler,
         (SELECT COUNT(*) FROM words) AS kelimeler,
         (SELECT COUNT(*) FROM sentences) AS cumleler
`)));
db.close();
console.log(`\n✓ ${OUT_DB}`);
