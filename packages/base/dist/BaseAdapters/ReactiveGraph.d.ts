export type EffectFn = () => void;
type PropKey = string | symbol;
export declare class ReactiveGraph {
    private activeEffect;
    private pendingEffects;
    private flushScheduled;
    /** target → prop → dep(effects that read it) */
    private graph;
    /** effect → deps it touched (for cleanup when body re-runs / unwatch) */
    private owned;
    private getDep;
    /** Called from the proxy `get` handler while an effect is running. */
    track(target: object, prop: PropKey): void;
    /** Called from the proxy `set`/`deleteProperty` handlers. */
    notify(target: object, prop: PropKey): void;
    private schedule;
    private releaseDeps;
    /**
     * Runs `fn` immediately, then re-runs it whenever any proxied state
     * it read during the last run mutates. Returns an unwatch function.
     */
    watchEffect(fn: EffectFn): () => void;
}
export {};
//# sourceMappingURL=ReactiveGraph.d.ts.map