export type BindableElement = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
export declare class BuilderProxy {
    /** Identity cache: raw payload object → its reactive proxy. */
    private readonly proxyCache;
    /** 🧲 Per-proxy reactive effect graph (owned, not module-global). */
    private readonly reactive;
    constructor(proxyCache: WeakMap<any, any>);
    makeReactive(key: string, payload: any, onUpdateCallback?: (target: any, prop: string | symbol, value: any) => void): any;
    getByPath(obj: any, path: string): any;
    setByPath(obj: any, path: string, value: any): void;
    readValue(el: BindableElement): any;
    writeValue(el: BindableElement, value: any): void;
    bind(root: HTMLElement, source: any): void;
    sync(root: HTMLElement, source: any): void;
    /**
     * 🧲 Runs `fn` immediately and re-runs it whenever proxied state read
     * inside it mutates. Delegates to the owned ReactiveGraph.
     */
    watchEffect(fn: () => void): () => void;
    /**
     * 🔄 STATE → UI AUTO-SYNC (reactive one-way binding)
     * Watches every `[data-bind]` control under `root` inside one effect:
     * writing to any proxied state path the controls point at re-writes
     * the control values automatically. Returns an unwatch function.
     */
    bindReactive(root: HTMLElement, source: any): () => void;
    getBindingPath(el: BindableElement): string | null;
}
//# sourceMappingURL=BuilderProxy.d.ts.map