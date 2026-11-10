import type { AnimationBehaviour } from './types';
export interface TypewriterOptions {
    /** Loop terus-menerus / batas jumlah putaran. Dioverride oleh atribut data-tw-loop. */
    loop: boolean | number;
    /** Jeda antar karakter (ms). Angka tunggal, atau array untuk interval acak. */
    interval: number | number[];
    /** Mode tulis-ulang kalimat. Dioverride oleh atribut data-tw-rewrite. */
    rewrite: boolean;
    /**
     * Jeda kalimat (ms) sebelum hapus mundur / lanjut kalimat berikutnya.
     * CATATAN PARITAS 1:1: nilai ini HARUS di-resolve oleh pemanggil dari
     * atribut data-delay atau globalDelay (config.delay) — BUKAN
     * config.typewriter.delay — persis seperti perilaku
     * AnimationsService._handleTypewriter versi lama.
     */
    delay: number;
}
/** `animation="typewriter"` — typing engine with rewrite and loop scenarios. */
export declare const typewriterBehaviour: AnimationBehaviour<TypewriterOptions>;
//# sourceMappingURL=typewriter.d.ts.map