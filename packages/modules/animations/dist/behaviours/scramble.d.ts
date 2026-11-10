import type { AnimationBehaviour } from './types';
export interface ScrambleOptions {
    /** Pool karakter acak yang dipakai untuk mengacak teks (gaya Matrix/Cyberpunk) */
    chars: string;
    /** Durasi acak per karakter (ms) */
    speed: number;
}
/** `animation="text-scramble"` — Matrix/Cyberpunk decode entrance. */
export declare const scrambleBehaviour: AnimationBehaviour<ScrambleOptions>;
//# sourceMappingURL=scramble.d.ts.map