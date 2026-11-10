/** Handle returned by `BackgroundCircleAnimation`, so a host can stop the loop. */
export interface CircleAnimationHandle {
    /**
     * Stops the animation frame loop and detaches every listener.
     * Idempotent: calling it twice is safe.
     */
    destroy(): void;
}
export declare function BackgroundCircleAnimation(canvas: HTMLCanvasElement): CircleAnimationHandle;
//# sourceMappingURL=circle-background.d.ts.map