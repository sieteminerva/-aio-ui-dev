import type { DefaultSelectors, iBuilderRegistry, iNodeContent } from "./interface";
export declare class DOMRenderer<C extends Partial<any> = {}, S extends string = DefaultSelectors> {
    #private;
    /** Slot this class fills when registered as an app module. */
    static readonly slot: "renderer";
    config: any;
    private records;
    constructor(config?: C);
    private parseKey;
    /**
     * Main compilation gateway that transforms declarative iNodeContent schemas into live DOM trees.
     */
    render(content: iNodeContent<S>, renderFn: ((node: any) => HTMLElement | null) | undefined, builderFn: ((name: keyof iBuilderRegistry, data: any) => HTMLElement | null) | undefined, options?: {
        scopeId?: string;
        parentKey?: string | null;
    }): HTMLElement;
    private buildStructure;
    /**
     * 👑 ATTACH METADATA (SATU-SATUNYA PUSAT PENGENDALIAN MEMORI MARKUP MANUAL ANDA!)
     * Sekarang bertindak sebagai gerbang tunggal: Mencatat silsilah, menjahit children dua arah,
     * dan langsung menyuntikkan tangki lazy closure getMetadata ke kulit ari elemen!
     */
    private attachMetadata;
    private mountHandler;
    /**
     * Phase 1: Spawns clean HTMLElement instances or intercepts live hijacked nodes.
     */
    private nodeFactory;
    /**
     * Phase 2: Stamps IDs, classNames list, and handles custom inline data attributes dictionary.
     * Pair-stamping delegated to Utility/AttributeUtils.
     */
    private attributeProcessor;
    /**
     * Phase 3: Triggers onCreated lifecycle bindings securely via sandbox proxies closures.
     */
    private lifecycleManager;
    /**
     * Phase 4: Hydrates the inner content node chambers dynamically using polymorphic sniffing.
     */
    private contentEvaluator;
    /**
     * Safe Destroy Method: Unmounts an element tree from the DOM and recursively executes cleanup hooks.
     */
    unmount(targetElement: HTMLElement): void;
}
//# sourceMappingURL=DOMRenderer.d.ts.map