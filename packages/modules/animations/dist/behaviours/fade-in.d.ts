import type { AnimationBehaviour } from './types';
export interface FadeInOptions {
    /** Durasi transisi CSS (mis. '0.5s' atau '500ms'), di-set sebagai variabel --fade-duration */
    duration: string;
}
/** `animation="fade-in"` — WAAPI opacity/translate entrance. */
export declare const fadeInBehaviour: AnimationBehaviour<FadeInOptions>;
//# sourceMappingURL=fade-in.d.ts.map