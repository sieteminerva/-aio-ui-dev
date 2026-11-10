/**
 * MODUL: LOADING PLACEHOLDER (ANTI-FOUC LAZY-RELEASE)
 *
 * Modul pendamping sistem `isLoaded` di Builder + gated loading pada
 * ComponentRegistry. Ketika komponen lazy-load masih menunggu stylesheet /
 * hydrator-nya selesai, Builder telah membekukan elemen dengan:
 *   - class `anim-placeholder-active` (skin shimmer, lihat Animations.css),
 *   - backup opasitas asli di atribut `data-anim-hold-opacity`,
 *   - token `animation="loading-placeholder"` sebagai penanda deteksi.
 *
 * Tugas modul ini saat dipicu (stylesheet sudah masuk):
 * 1. Menunggu `duration` (ms) — memberi ruang font/reflow akhir menstabil.
 * 2. Melepas kelas shimmer secara MULUS: fase transisi ditanam dulu
 *    (CSS `[data-anim-hold-opacity]` memegang transition sehingga rentetan
 *    perubahan warna/border teranimasi), baru class dibuang dua-frame kemudian.
 * 3. Memulihkan opasitas asli dari backup, lalu membersihkan jejak atribut.
 * 4. Menyalakan `onDone` → AnimationsService menembakkan event
 *    `animation:done` (chained animation kembali mengalir normal).
 */
import type { AnimationBehaviour } from './types';
export interface LoadingPlaceholderOptions {
    /** Jeda tunggu (ms) sebelum pelepasan dimulai — default mengikuti globalDelay. */
    duration: number;
    /**
     * Jeda tambahan (ms) antara pelepasan transisi vs pelepasan kelas shimmer.
     * Default 420ms (sedikit di atas durasi transisi CSS 0.35s).
     */
    instantRevealDelayTime?: number;
    /**
     * Opasitas cadangan bila atribut backup kosong/tidak ada (mis. dipakai ulang
     * pada node yang backup-nya sudah dibersihkan proses lain). Default: "1".
     */
    restoreFallbackOpacity?: string;
}
/** `animation="loading-placeholder"` — anti-FOUC release of a frozen placeholder. */
export declare const loadingPlaceholderBehaviour: AnimationBehaviour<LoadingPlaceholderOptions>;
//# sourceMappingURL=loading-placeholder.d.ts.map