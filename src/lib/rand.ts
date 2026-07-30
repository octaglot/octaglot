/* Rastgelelik tek yerde toplanıyor: fırtına ve görev modülleri `generate.ts`'i
   import edemiyor — o dosya `db.ts` üzerinden Tauri eklentisini çekiyor ve
   Node testinde yüklenmiyor. */

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];

/* Tohumlu üreteç: günlük görevlerin gün içinde sabit kalması için gerekiyor.
   mulberry32 — 32 bitlik durum, kısa periyot ama bu iş için fazlasıyla yeterli. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
