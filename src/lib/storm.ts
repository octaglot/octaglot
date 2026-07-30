import { shuffle } from './rand';
import type { Word } from './types';

/* Eşleştirme Fırtınası: 60 saniyede olabildiğince çok kelime çifti.
   Ders değil arcade — bu yüzden can harcamıyor. Verilen cevaplar yine de
   aralıklı tekrara yazılıyor (bkz. StormScreen), yani mod tekrarın kopyası
   değil hızlandırıcısı. */

export const STORM_SECONDS = 60;
export const STORM_SLOTS = 5;
export const STORM_PENALTY = 2; // yanlışta giden saniye
export const STORM_XP_RUNS = 3; // günde XP veren tur sayısı
export const STORM_MAX_XP = 40;
export const STORM_COMBO_CAP = 5;

/** Havuz sırası: vadesi gelmiş kelimeler önce, her iki küme kendi içinde karışık. */
export function stormPool(words: Word[], dueIds: number[]): Word[] {
  const due = new Set(dueIds);
  return [...shuffle(words.filter((w) => due.has(w.id))), ...shuffle(words.filter((w) => !due.has(w.id)))];
}

/**
 * Havuzdan `n` yeni kelime çeker.
 * `onStage` şu an ekranda duranlar, `seen` bu turda çıkmışlar. Havuz tükenirse
 * `seen` sıfırlanır ve baştan sarılır: 60 saniyelik bir turda kart bitmesin.
 * `seen` bilerek yerinde değiştiriliyor — çağıranın ayrıca sıfırlaması gereken
 * ikinci bir kural olmasın.
 */
export function stormDraw(pool: Word[], onStage: number[], seen: Set<number>, n: number): Word[] {
  const stage = new Set(onStage);
  const free = () => pool.filter((w) => !stage.has(w.id) && !seen.has(w.id));
  let candidates = free();
  if (candidates.length < n) {
    seen.clear();
    candidates = free();
  }
  return candidates.slice(0, n);
}

/** Doğru cevabın puanı. Kombo beşte doyar: tur sonu puanı patlamasın. */
export function stormPoints(combo: number): number {
  return 10 * Math.min(STORM_COMBO_CAP, Math.max(1, combo));
}

/**
 * Turun XP'si. Günün ilk `STORM_XP_RUNS` turu XP verir, sonrası puan içindir.
 * Sınırsız XP veren 60 saniyelik bir mod günlük hedefi (varsayılan 50 XP)
 * anlamsızlaştırır; dersler oyunun ana yolu kalmalı.
 * `runsToday` bu turdan ÖNCEKİ tur sayısıdır.
 */
export function stormXp(score: number, runsToday: number): number {
  if (runsToday >= STORM_XP_RUNS) return 0;
  return Math.min(STORM_MAX_XP, Math.floor(score / 25));
}
