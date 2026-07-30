import type { ExerciseKind } from './types';

/* Ayrı dosya: `generate.ts` `db.ts` üzerinden Tauri eklentisini çekiyor ve Node
   testinde yüklenmiyor; bu sabit listenin ondan bağımsız durması gerekiyor.

   Efsanenin ayırt edici yanı üretim zorunluluğu: kelime bankası, çoktan
   seçmeli, eşleştirme ve kelime kartı tanımayla çözülebildiği için dışarıda. */
export const LEGENDARY_KINDS: ExerciseKind[] = ['typeTr', 'listen', 'blank', 'order'];
