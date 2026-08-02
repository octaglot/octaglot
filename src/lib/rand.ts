/* Randomness is collected in one place: the storm and quest modules cannot
   import `generate.ts` - that file pulls in the Tauri plugin through `db.ts`
   and will not load under a Node test. */

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];

/* Seeded generator: needed so the daily quests stay fixed through the day.
   mulberry32 - 32 bits of state, short period, but more than enough here. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
