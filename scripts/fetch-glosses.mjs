#!/usr/bin/env node
// Fetches Turkish glosses for the candidate words from Wiktionary (kaikki.org).
//
// Two layers:
//   data/kaikki-raw.json -> the raw translation lists as downloaded (a durable cache)
//   data/glosses.json    -> the final glosses derived from them
//
// You do not need to download again when you change the selection logic; just
// run `node scripts/fetch-glosses.mjs --derive`.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const CANDIDATES = join(ROOT, 'data', 'candidates.json');
const RAW_CACHE = join(ROOT, 'data', 'kaikki-raw.json');
const GLOSSES = join(ROOT, 'data', 'glosses.json');

const CONCURRENCY = 8;
const DERIVE_ONLY = process.argv.includes('--derive');

if (!existsSync(CANDIDATES)) {
  console.error('✗ data/candidates.json yok. Önce: npm run content:candidates');
  process.exit(1);
}

const words = JSON.parse(readFileSync(CANDIDATES, 'utf8'));
const raw = existsSync(RAW_CACHE) ? JSON.parse(readFileSync(RAW_CACHE, 'utf8')) : {};

/* ------------------------------------------------------------------ */
/* Download                                                            */
/* ------------------------------------------------------------------ */

// Extracts the Turkish translations per part of speech from a word's page.
function extractEntries(lines) {
  const entries = [];
  for (const line of lines) {
    let o;
    try {
      o = JSON.parse(line);
    } catch {
      continue;
    }
    const words = [];
    const push = (t) => {
      if ((t.code === 'tr' || t.lang === 'Turkish') && t.word) words.push(t.word);
    };
    for (const t of o.translations || []) push(t);
    for (const s of o.senses || []) for (const t of s.translations || []) push(t);
    if (words.length) entries.push({ pos: o.pos || '', words });
  }
  return entries;
}

async function fetchWord(w) {
  const url = `https://kaikki.org/dictionary/English/meaning/${w[0]}/${w.slice(0, 2)}/${encodeURIComponent(w)}.jsonl`;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'user-agent': 'octaglot-lang-app/1.0' } });
      if (res.status === 404) return [];
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      return extractEntries(text.trim().split('\n'));
    } catch (e) {
      if (attempt === 2) {
        console.warn(`  ! ${w}: ${e.message}`);
        return null; // null = başarısız, tekrar denenebilir
      }
      await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
    }
  }
  return null;
}

if (!DERIVE_ONLY) {
  const todo = words.filter((w) => !Array.isArray(raw[w]));
  console.log(`· ${words.length} aday, ${todo.length} tanesi indirilecek`);

  let done = 0;
  let cursor = 0;
  async function worker() {
    while (cursor < todo.length) {
      const w = todo[cursor++];
      const r = await fetchWord(w);
      if (r !== null) raw[w] = r;
      done++;
      if (done % 200 === 0) {
        writeFileSync(RAW_CACHE, JSON.stringify(raw));
        console.log(`  ${done}/${todo.length}`);
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  writeFileSync(RAW_CACHE, JSON.stringify(raw));
  console.log(`· ham önbellek: ${Object.keys(raw).length} kelime`);
}

/* ------------------------------------------------------------------ */
/* Derivation                                                          */
/* ------------------------------------------------------------------ */

// Cleans a Turkish gloss; returns null when it is not usable.
function cleanWord(w) {
  if (!w) return null;
  let s = w
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^[-–—]+|[-–—]+$/g, '')
    .trim();
  if (!s || s.length > 28) return null;
  if (s.split(' ').length > 3) return null;
  if (/[0-9<>=/\\]/.test(s)) return null;
  if (!/[a-zçğıöşüâîû]/i.test(s)) return null;
  return s;
}

// Which part of speech carries the main sense? Wiktionary's page order is a
// surprisingly reliable signal here: the page starts at "Etymology 1" and the
// most common part of speech comes first. The alternatives that were tried came
// out worse - "the one with the most translations" gave water->sulamak,
// run->koşu, because->öyle işte; "nouns first" gave go->go (the board game).
function deriveGloss(entries, english) {
  if (!entries || !entries.length) return null;

  const scored = entries
    .map((e, i) => {
      const cleaned = [];
      const seen = new Set();
      for (const w of e.words) {
        const c = cleanWord(w);
        if (!c) continue;
        const k = c.toLocaleLowerCase('tr');
        // Skip when the translation equals the English word (a loanword page)
        if (k === english) continue;
        if (seen.has(k)) continue;
        seen.add(k);
        cleaned.push(c);
      }
      return { pos: e.pos, order: i, words: cleaned };
    })
    .filter((e) => e.words.length);

  if (!scored.length) return null;
  scored.sort((a, b) => a.order - b.order);

  const best = scored[0];
  return { tr: best.words[0], alts: best.words.slice(1, 4), pos: best.pos };
}

const out = {};
let hits = 0;
for (const w of words) {
  const g = deriveGloss(raw[w], w);
  out[w] = g;
  if (g) hits++;
}
writeFileSync(GLOSSES, JSON.stringify(out));
console.log(`\n✓ ${hits}/${words.length} kelimenin Türkçe karşılığı var → ${GLOSSES}`);
