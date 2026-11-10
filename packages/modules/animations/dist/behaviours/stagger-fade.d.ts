import type { AnimationBehaviour } from './types';
export interface StaggerFadeOptions {
    /** Jeda bertingkat antar segmen (ms): segmen ke-n muncul setelah n × delay */
    delay: number;
    /** Durasi transisi tiap segmen (contoh: '0.6s' atau '600ms') */
    duration: string;
}
/** `animation="stagger-fade"` — segment-by-segment entrance. */
export declare const staggerFadeBehaviour: AnimationBehaviour<StaggerFadeOptions>;
//# sourceMappingURL=stagger-fade.d.ts.map