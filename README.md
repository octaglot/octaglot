# Octaglot

A gamified app for learning English, explained in Turkish. It runs as a macOS
desktop application and needs no internet connection.

40 units · 160 lessons · 720 words · 4160 sentences · A1 → B1

## Setup

The app builds to `Octaglot.app`:

```sh
npm install
npm run tauri build
```

Result: `src-tauri/target/release/bundle/macos/Octaglot.app`

While developing:

```sh
npm run tauri dev
```

## How the content is generated

Lesson content was not written by hand; it is compiled from open sources.

| Source | What it provides | License |
| --- | --- | --- |
| [Tatoeba](https://tatoeba.org) | 660k Turkish–English sentence pairs | CC-BY 2.0 FR |
| [hermitdave/FrequencyWords](https://github.com/hermitdave/FrequencyWords) | English word frequency list | CC-BY-SA 4.0 |
| [Wiktionary](https://kaikki.org) | Turkish glosses for the words | CC-BY-SA 3.0 |
| [FreeDict](https://freedict.org) | Fallback dictionary | GPL |

The curriculum is defined in `scripts/curriculum.mjs`: 40 thematic units, each
with its own core word list. The builder fills those lists out by frequency,
then picks, for every lesson, only the Tatoeba sentences **built entirely from
words taught up to that point**. Difficulty therefore rises on its own, in the
right order.

To regenerate the content (raw data lands under `data/raw/`, ~180 MB):

```sh
npm run content:candidates   # extract the candidate word list
npm run content:glosses      # pull Turkish glosses from Wiktionary
npm run content:build        # produce src-tauri/resources/content.db
```

`content:glosses` caches its downloads in `data/kaikki-raw.json`. You do not
need to download again when you change the gloss-selection logic:

```sh
npm run content:derive
```

### Notes on quality

Sense selection follows Wiktionary's **page order**. The alternatives that were
tried came out worse: "the sense with the most translations" gave
`water → sulamak`, `run → koşu`, `because → öyle işte`; "nouns first" gave
`go → go` (the board game).

The frequency list is derived from a subtitle corpus, so it contains profanity;
`BLOCKLIST` filters it out. Inflected forms such as `went → go` are removed from
the lesson vocabulary by `INFLECTED`. The individual errors that remain are
corrected by hand through `OVERRIDES` (`glass → bardak`, `plane → uçak`).

## Architecture

```
src/
  lib/
    db.ts          content and user database access
    store.ts       hearts / XP / streak / gems / spaced repetition / quests / legendary
    generate.ts    exercise generation from lesson data
    storm.ts       storm pool, card draw, scoring (pure)
    quests.ts      seeded daily quest generation (pure)
    rand.ts        shuffle / pick / seeded generator
    audio.ts       Web Audio sound effects + pronunciation
  components/
    Exercises.tsx  8 exercise types and scoring
    QuestCard.tsx  daily quest card
    Mascot.tsx     Okta (animated SVG octopus)
    Icons.tsx      flat SVG icon set
  screens/         map, lesson, storm, results
src-tauri/
  src/lib.rs       copies the content database into a writable directory
  resources/       content.db (shipped with the app)
```

**There are two databases.** `content.db` ships with the app and is read-only;
on first launch the Rust side copies it to a writable directory. `user.db`
holds progress. They are separate so that updating the content does not wipe
the user's progress.

**There are no audio files.** Effects are synthesized on the fly with the Web
Audio API and pronunciation goes through `speechSynthesis`. This keeps the
bundle small and avoids licensed audio.

## Exercise types

Flashcard · Multiple choice · Matching · Fill in the blank · Translation with a
word bank · Listen and type · Sentence ordering · Free translation

Three modes exist outside lessons; they are described below.

Free translation allows a single word-level deviation — Tatoeba gives each
sentence one reference translation, so strict matching would be unfair.

## Modes outside lessons

The app is offline and single-user, so Duolingo's leagues and friend
competition do not carry over. Rather than inventing fake rivals, you compete
against your own history and against daily quests.

**Matching Storm.** Match word pairs against a 60-second clock. It costs no
hearts, a wrong answer takes 2 seconds off the timer, and the combo caps at
five. The pool is built from the words of completed lessons; words due for
review are moved to the front, and every answer given is written back into
spaced repetition — the mode is an accelerator for review, not a copy of it. It
stays locked until 20 words are learned, because in a small pool the same pair
keeps reappearing. The first 3 rounds each day award XP (a twenty-fifth of the
score, up to 40): a 60-second mode handing out unlimited XP would make the
50 XP daily goal meaningless.

**Daily quests.** Three quests a day, chosen with a seed derived from the
date — close and reopen the app and the same three come back. Each quest pays
10 gems, finishing all three adds a 15 bonus; rewards are claimed manually.
What gets measured comes from events that already exist: XP, lessons finished,
the longest correct streak within a lesson, storm score, words reviewed.

**Legendary level.** An option that appears when you tap a completed lesson.
It costs 30 gems and no hearts; instead you get three mistakes, and once they
are used up the gems are not refunded. Questions come from the whole unit
rather than a single lesson, and only production-based types are used (free
translation, listen and type, fill in the blank, sentence ordering) — the word
bank and multiple choice are left out because they can be solved by
recognition. A passed lesson keeps a crown and a gold ring on the map, and the
reward is 60 XP.

## Tests

```sh
npm test
```

Vitest covers only the pure modules (`storm.ts`, `quests.ts`,
`legendaryKinds.ts`). Screens and the store are not tested: `db.ts` pulls in the
Tauri plugin, which does not load under Node. The game logic was therefore
split into modules that touch neither the database nor React.

## Design

Only the **mechanics** were taken from Duolingo: 3D push buttons, round heavy
typography (Nunito), the zigzag lesson path, the hearts/streak/XP loop. The
**palette was deliberately not taken** — Duolingo is built on an acid green
(#58cc02) over pure grey neutrals; Octaglot is built on purple (#8a63d2, the
GitHub Desktop purple) and pulls its neutrals toward purple as well.

Every color lives in `src/design/tokens.css` under a **role name**
(`--brand`, `--success`, `--danger`…); components never write hex. Broad
surfaces carrying white text use `--brand-strong` / `--deep-*` rather than
`--brand`: against white, `--brand` measures 4.38:1 and falls below the WCAG AA
threshold.

### Brand

**The mark** is two interlocking rings — two languages locked together. Outer
radius 60, inner radius 30, centers 60 units apart; each ring leaves the
quarter that meets the other one empty, so they interlock without overlapping.
The stroke is uniform throughout, so the mark does not fill in at 16 pixels.
Source files live under `public/brand/`.

**The app icon** follows Apple's macOS grid: on a 1024 canvas the artwork sits
inside an 824×824 area and the remaining margin is transparent — that is the
only way to match the optical size of its neighbours in the Dock. The corners
are drawn as a superellipse (squircle), not a rounded rectangle.

**The mascot** is Okta, a purple octopus; its eight arms map to the eight
exercise types. The artwork is adapted from the octopus emoji (U+1F419) in
[Twemoji](https://github.com/jdecked/twemoji), licensed **CC-BY 4.0**. The
attribution appears on the app's profile screen. What changed: the back and
middle arms were split off into separate paths and animated independently, and
eyes and a mouth were added to carry the mascot's mood.
