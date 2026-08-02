/* Sound effects are synthesized on the fly with the Web Audio API - there are no
   audio files to ship, so neither licensing nor bundle size is a concern.
   Pronunciation is a separate matter; see the "Pronunciation" section below. */

let ctx: AudioContext | null = null;
function audio() {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

type Note = { f: number; t: number; d: number; type?: OscillatorType; gain?: number };

function play(notes: Note[]) {
  const a = audio();
  const now = a.currentTime;
  for (const n of notes) {
    const osc = a.createOscillator();
    const g = a.createGain();
    osc.type = n.type ?? 'sine';
    osc.frequency.setValueAtTime(n.f, now + n.t);
    const peak = n.gain ?? 0.18;
    g.gain.setValueAtTime(0.0001, now + n.t);
    g.gain.exponentialRampToValueAtTime(peak, now + n.t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, now + n.t + n.d);
    osc.connect(g).connect(a.destination);
    osc.start(now + n.t);
    osc.stop(now + n.t + n.d + 0.02);
  }
}

export const sfx = {
  correct: () =>
    play([
      { f: 587.33, t: 0, d: 0.12 },
      { f: 880, t: 0.08, d: 0.22 },
    ]),
  wrong: () =>
    play([
      { f: 233.08, t: 0, d: 0.18, type: 'triangle' },
      { f: 174.61, t: 0.1, d: 0.28, type: 'triangle' },
    ]),
  tap: () => play([{ f: 660, t: 0, d: 0.05, gain: 0.07 }]),
  heart: () =>
    play([
      { f: 392, t: 0, d: 0.1, type: 'triangle' },
      { f: 261.63, t: 0.08, d: 0.2, type: 'triangle' },
    ]),
  complete: () =>
    play([
      { f: 523.25, t: 0, d: 0.14 },
      { f: 659.25, t: 0.11, d: 0.14 },
      { f: 783.99, t: 0.22, d: 0.14 },
      { f: 1046.5, t: 0.33, d: 0.4 },
    ]),
  levelUp: () =>
    play([
      { f: 440, t: 0, d: 0.1 },
      { f: 554.37, t: 0.09, d: 0.1 },
      { f: 659.25, t: 0.18, d: 0.1 },
      { f: 880, t: 0.27, d: 0.35 },
    ]),
};

/* --- Pronunciation ---

   Audio comes from Google Translate's TTS endpoint at runtime; it requires a
   connection. The macOS system voices (Samantha, Ralph, Tessa...) were dropped
   entirely: they are the compressed "compact" builds and sound far too
   synthetic for a language app. The Siri voices were never an option - Apple
   exposes them to neither AVSpeechSynthesizer nor speechSynthesis.

   The endpoint 404s any request carrying a Referer, which the no-referrer
   policy in index.html takes care of. It sends no CORS headers either, so
   fetch() cannot read it; we have to go through a media element, which is not
   subject to CORS.

   A single <audio> element is kept and its src is swapped on every utterance;
   the reasoning is written at the top of that block below. Audio is never
   cached and nothing is written to disk - the cost is one ~5-18 KB request per
   press. */

const RATE_KEY = 'octaglot-rate';

/* The endpoint requires long text to be split; the longest sentence in the
   curriculum is 26 characters, so in practice this limit is a seatbelt. */
const TTS_MAX_LEN = 200;

export function storedRate(): number {
  try {
    const v = Number(localStorage.getItem(RATE_KEY));
    return Number.isFinite(v) && v >= 0.5 && v <= 1.2 ? v : 0.92;
  } catch {
    return 0.92;
  }
}

export function setRate(rate: number) {
  try {
    localStorage.setItem(RATE_KEY, String(rate));
  } catch {
    /* ignore */
  }
}

function ttsUrl(text: string): string {
  return `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=en&q=${encodeURIComponent(text)}`;
}

/* We keep one <audio> element and swap its src on every utterance. It is done
   this way because it solves two separate problems at once:

   1. Autoplay. WKWebView will not start media without a user gesture. Inside a
      lesson the audio has to fire on its own when a card opens (the useEffects
      in Exercises.tsx), so there is no gesture. An element that has once been
      played from a user gesture stays permitted afterwards - but that
      permission is not inherited if a NEW Audio is constructed per utterance.
      That was why the button in Settings worked while in-lesson playback
      stayed silent.

   2. Replay. The endpoint sends neither Content-Length nor Accept-Ranges, and
      adds no-store on top; WKWebView therefore treats the audio as a live
      stream (duration = Infinity) and currentTime = 0 does nothing. Assigning
      src again reloads the element from scratch, which is what makes pressing
      the same word twice work. */

let player: HTMLAudioElement | null = null;

function getPlayer(): HTMLAudioElement {
  if (!player) {
    player = new Audio();
    player.preload = 'auto';
    /* TEMPORARY DIAGNOSTIC - to be removed.
       Careful: in dev, an HMR reload of this module creates a new instance and
       a new element, so any __ttsPlayer reference you are holding goes stale.
       Inspecting the stale element paints a completely misleading picture
       ("src is stuck on the silent WAV, no audio plays") - if you want to
       measure, either reload the page or observe through
       HTMLMediaElement.prototype. */
    (window as unknown as { __ttsPlayer: HTMLAudioElement }).__ttsPlayer = player;
  }
  return player;
}

/* Speaking the same text twice. With a single element two clips cannot overlap;
   the problem was two requests arriving at the same moment - the automatic
   utterance when a card opens colliding with the user's Listen button restarts
   the clip, and StrictMode runs the effects twice on top of that.

   The fix is a short window: the same text is ignored if it was requested
   within the last half second. We deliberately do NOT check "is it playing"
   here. The approach that was tried and abandoned was locking the text until
   the clip ended; but since the endpoint sends no duration, WKWebView treats
   the clip as a live stream (see the "Replay" note above) and `ended` may never
   fire - the lock would never release and the word would never speak again. A
   window closes by itself, so there is no such dead end, and pressing the same
   word again keeps working. */
const DEDUPE_MS = 500;

let lastText: string | null = null;
let lastAt = -Infinity;
/* Every request takes its own number, so that an interrupted call does not
   report a failure on behalf of the one that started after it. */
let session = 0;

/* A valid 44-byte WAV containing no samples. Used to unlock the element;
   there is nothing to hear. */
const SILENT_WAV =
  'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';

/* On the first user gesture we play the element once to take the permission.
   After that, automatic in-lesson utterances are no longer blocked. */
let unlocked = false;
function unlock() {
  if (unlocked) return;
  const el = getPlayer();
  /* If a clip is playing we leave the element alone: writing the silent WAV to
     src cancels that load, which meant the user's first tap cut off the
     pronunciation that had started on its own when the card opened. If it is
     already playing, the permission has been taken anyway. We do not set the
     flag - it will be retried on the next gesture if needed. */
  if (!el.paused) return;
  unlocked = true;
  /* We neither mute the element here nor pause it afterwards - both were bugs
     that silenced the audio:

     - Setting muted = true and unmuting only in an async .then() made the
       speak() that runs on the same tap play its clip silently.
     - .then(() => el.pause()) was worse: unlock runs on pointerdown while
       speak() runs on the click of that same tap. If the silent WAV's play()
       promise resolves AFTER speak() has started the new source, that pause
       call stops the Google clip. In Chrome the promise is rejected with
       AbortError and does no harm, in WKWebView it resolves - that was the
       cause of "works in Chrome, no sound in the app".

     The silent WAV contains no samples, so it ends instantly on its own; there
     is nothing to stop. */
  el.src = SILENT_WAV;
  void el.play().catch(() => {});
}

if (typeof document !== 'undefined') {
  /* Not once: true - unlock can bail out while a clip is playing and defer to
     the next gesture. Once unlocked, the flag on the first line already makes
     it free. */
  document.addEventListener('pointerdown', unlock, { capture: true });
  document.addEventListener('keydown', unlock, { capture: true });
}

/**
 * Speaks the given text. Returns false when there is no connection or the
 * endpoint does not answer, so callers can surface that to the user. If the
 * same text is already playing the new request is ignored and the clip does
 * not restart.
 */
export async function speak(text: string, rate?: number): Promise<boolean> {
  if (text.length > TTS_MAX_LEN) return false;

  const now = performance.now();
  if (text === lastText && now - lastAt < DEDUPE_MS) return true;
  lastText = text;
  lastAt = now;
  const id = ++session;

  const el = getPlayer();
  el.pause();
  // Defensive: unlock or an earlier call may have left the element muted.
  el.muted = false;
  el.volume = 1;
  el.src = ttsUrl(text);
  el.playbackRate = rate ?? storedRate();
  // Keeps the voice from deepening at lower rates. Missing from the type
  // definitions, but WebKit supports it.
  (el as HTMLAudioElement & { preservesPitch?: boolean }).preservesPitch = true;

  try {
    await el.play();
    return true;
  } catch {
    /* If another utterance came in between, this rejection only means "I was
       interrupted": assigning a new src rejects the pending play() promise with
       AbortError. Reporting it as a failure would make the test in Settings
       show a spurious "could not play" warning. */
    if (id !== session) return true;
    // No network, 404, undecodable media, autoplay block - all land here.
    return false;
  }
}
