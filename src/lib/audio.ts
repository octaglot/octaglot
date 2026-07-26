/* Ses efektleri Web Audio API ile anlık üretiliyor — paketlenecek ses dosyası
   yok, dolayısıyla telif ve boyut sorunu da yok. Telaffuz için tarayıcının
   speechSynthesis motoru kullanılıyor (macOS'un İngilizce sesleri). */

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

/* --- Telaffuz --- */

let englishVoice: SpeechSynthesisVoice | null = null;

function pickVoice() {
  if (englishVoice) return englishVoice;
  const voices = speechSynthesis.getVoices();
  englishVoice =
    voices.find((v) => /^en-US/i.test(v.lang) && /samantha|alex|ava|allison/i.test(v.name)) ??
    voices.find((v) => /^en-US/i.test(v.lang)) ??
    voices.find((v) => /^en/i.test(v.lang)) ??
    null;
  return englishVoice;
}

if (typeof speechSynthesis !== 'undefined') {
  speechSynthesis.addEventListener('voiceschanged', () => {
    englishVoice = null;
    pickVoice();
  });
}

export function speak(text: string, rate = 0.95) {
  if (typeof speechSynthesis === 'undefined') return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const v = pickVoice();
  if (v) u.voice = v;
  u.lang = 'en-US';
  u.rate = rate;
  speechSynthesis.speak(u);
}
