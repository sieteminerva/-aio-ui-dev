export class ReactiveGraph {
    activeEffect = null;
    pendingEffects = new Set();
    flushScheduled = false;
    /** target → prop → dep(effects that read it) */
    graph = new WeakMap();
    /** effect → deps it touched (for cleanup when body re-runs / unwatch) */
    owned = new WeakMap();
    getDep(target, prop) {
        let props = this.graph.get(target);
        if (!props) {
            props = new Map();
            this.graph.set(target, props);
        }
        let dep = props.get(prop);
        if (!dep) {
            dep = { effects: new Set() };
            props.set(prop, dep);
        }
        return dep;
    }
    /** Called from the proxy `get` handler while an effect is running. */
    track(target, prop) {
        if (!this.activeEffect || typeof prop === "symbol")
            return;
        const dep = this.getDep(target, prop);
        if (dep.effects.has(this.activeEffect))
            return;
        dep.effects.add(this.activeEffect);
        let list = this.owned.get(this.activeEffect);
        if (!list) {
            list = new Set();
            this.owned.set(this.activeEffect, list);
        }
        list.add(dep);
    }
    /** Called from the proxy `set`/`deleteProperty` handlers. */
    notify(target, prop) {
        const dep = this.graph.get(target)?.get(prop);
        if (!dep)
            return;
        for (const fn of Array.from(dep.effects))
            this.schedule(fn);
    }
    schedule(effect) {
        this.pendingEffects.add(effect);
        if (this.flushScheduled)
            return;
        this.flushScheduled = true;
        queueMicrotask(() => {
            this.flushScheduled = false;
            const batch = Array.from(this.pendingEffects);
            this.pendingEffects.clear();
            for (const fn of batch)
                fn();
            // Re-entrancy (an effect writing state during flush) re-schedules
            // through `schedule()` on the next microtask — no infinite hot loop.
        });
    }
    releaseDeps(effect) {
        const list = this.owned.get(effect);
        if (!list)
            return;
        for (const dep of list)
            dep.effects.delete(effect);
        list.clear();
    }
    /**
     * Runs `fn` immediately, then re-runs it whenever any proxied state
     * it read during the last run mutates. Returns an unwatch function.
     */
    watchEffect(fn) {
        let disposed = false;
        const run = () => {
            if (disposed)
                return;
            this.releaseDeps(run); // conditional reads re-track correctly each pass
            this.activeEffect = run;
            try {
                fn();
            }
            finally {
                this.activeEffect = null;
            }
        };
        run();
        return () => {
            if (disposed)
                return;
            disposed = true;
            this.releaseDeps(run);
            this.pendingEffects.delete(run);
        };
    }
}
//# sourceMappingURL=ReactiveGraph.js.map