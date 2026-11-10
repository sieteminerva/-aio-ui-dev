/**
 * MODUL: COUNT UP (angka dinamis/statistik)
 *
 * Port 1:1 dari _handleCountUp lama di AnimationsService (masih berupa kerangka):
 * membaca angka dari textContent lalu menyimpannya di atribut
 * data-target-number untuk diproses oleh logika JS count-up lanjutan.
 *
 * CATATAN PARITAS: versi lama TIDAK memicu event 'animation:done' (belum ada
 * implementasinya), sehingga modul ini juga sengaja belum menyediakan onDone.
 * Modul ini tidak punya konfigurasi, sehingga tidak perlu interface Options.
 */
import type { AnimationBehaviour } from './types';
/** `animation="count-up"` — reads the target number and hands it to the counter. */
export declare const countUpBehaviour: AnimationBehaviour;
//# sourceMappingURL=count-up.d.ts.map