import type { iBuilderRegistry, iBuilderConfig, iElementProperty, iNodeRecordItem, iNodeRecordRelations } from "@aio-ui/core/interface";
import { BuilderProxy } from "./BaseAdapters/BuilderProxy";
export declare const GLOBAL_INSTANCE_COUNTER: Map<string, number>;
/**
 * @classdesc
 * Builder is the abstract foundation for declarative landing-page components.
 * It provides a unified lifecycle for resolving configuration, generating stable namespaces,
 * creating reactive DOM node records, and managing component teardown without leaking state.
 *
 * Concrete builders extend this class to define their own builder identity, stylesheet,
 * render strategy, and initialization behavior while inheriting the shared lifecycle engine.
 *
 * Builder — core lifecycle engine for component-based page rendering
 *
 * @example
 * class HeroBuilder extends Builder<"container" | "title", HeroConfig> {
 *   readonly builderId = "hero";
 *   readonly name = "hero";
 *   readonly stylesheet = "/hero.css";
 *
 *   protected template(typeKey, el, payload) {
 *     if (typeKey === "title") el.textContent = payload?.value ?? "Welcome";
 *   }
 *
 *   public prepare(content, config) {
 *     return this.render("container", content);
 *   }
 *
 *   public initialize() {}
 * }
 *
 * const builder = new HeroBuilder();
 * const element = builder.create({ title: "Hello" });
 *
 * ========== Public Lifecycle API ==========
 *
 * @example
 * builder.create(data, config);
 * builder.destroy();
 * builder.attach("typeKey", "slotKey", payload);
 * builder.detach("slotKey");
 *
 * @template TType - A string literal union representing the allowed selector tokens for the child component.
 * @template TConfig - The builder-specific configuration interface compatible with iBuilderConfig.
 *
 * @author YMGH
 * @version 1.0.0
 */
export declare abstract class Builder<TType extends string = string, TConfig extends iBuilderConfig<TType> = iBuilderConfig<TType>> {
    #private;
    /** 🧩 ROOT of the builder that hosts my projections — the shared ancestor
     *  token vars are painted on; null when I have no caller (standalone). Set
     *  in `attach()` the first time I project into a caller. */
    protected rootElement: HTMLElement | null;
    static resetCounters(): void;
    /**
     * @description
     * Resolves the component's stable runtime identity by generating a deterministic seed,
     * combining it with the current namespace context, and building a selector hierarchy tree.
     * This method also manages a static namespace stack for nested builders and supports
     * explicit overrides when a caller needs to pin a namespace manually.
     *
     * @param content - The source payload used to derive the namespace seed.
     * @param config - Optional builder configuration that can contribute selectors or namespace metadata.
     * @param options - Optional overrides for namespace stack behavior, explicit namespace assignment,
     *   or custom seed generation input.
     *
     * @returns An object containing the resolved namespace, selector hierarchy, seed, and whether
     *   the namespace was pushed to the internal stack during resolution.
     *
     * @protected
     */
    protected ensureIdentity(content: any, config?: TConfig, options?: {
        /** Push resolved namespace onto static stack (for nested builders) */
        pushNamespace?: boolean;
        /** Pop namespace from stack after resolution (for nested builders) */
        popNamespace?: boolean;
        /** Explicit namespace to use instead of resolving */
        explicitNamespace?: string;
        /** Optional config overrides for seed generation */
        seedConfig?: Partial<TConfig>;
    }): {
        /** The resolved unique namespace string */
        namespace: string;
        /** Selector hierarchy tree for this identity */
        hierarchy: Record<string, any>;
        /** The stable hash seed used for namespace generation */
        seed: string;
        /** Whether a new namespace was pushed onto the stack */
        pushed: boolean;
    };
    /**
     * The distinct, unique registry identifier allocated to the specific component subclass.
     */
    abstract readonly builderId: keyof iBuilderRegistry;
    /**
     * The human-readable name string designated to characterize the component wrapper class.
     */
    abstract readonly name: keyof iBuilderRegistry;
    /**
     * The human-readable name string designated to characterize the component wrapper class.
     */
    abstract readonly stylesheet: string;
    /**
     * The frozen state configuration container holding consolidated options, emitters, and structural selectors.
     */
    config: Required<TConfig>;
    protected instanceNamespace: string | null;
    /**
     * Internal reference holder pointing directly to the raw, unmutated data node extracted from the spreadsheet database.
     */
    protected activeLiveThemeId: string;
    /**
     * 👑 LAZY HIERARCHY ENGINE
     * Mengisolasi pengerjaan rekonsiliasi silsilah agar tidak membebani loop render()
     */
    protected hierarchy: {
        get: () => Record<string, any>;
        /**
         * 📝 STORE (registration-time, called by render()) — cheap: only ensures a
         * relations entry exists for the key (reusing the static selectorToTree
         * entry when present) and returns it. NO DOM reading here — template()
         * hasn't run yet, so the subtree would be invalid. render() stores the
         * returned object as the node record's `relations`, so the record and
         * hierarchy.get() share one object that update() later fills.
         */
        store: (key: string) => iNodeRecordRelations;
        /**
         * ⚡ DIRECT-LAYER ELEMENT INVENTORY (same spirit as DOMRenderer.attachMetadata)
         * Called from create(), AFTER prepare()/initialize() — template() may do
         * arbitrary DOM operations, so only now is each node's subtree final.
         *
         * For every key in storage.nodes, searches through its live element and
         * stores the SELECTOR STRING (`tag#id.classes`) of every element found
         * inside it into `relations.elements`.
         *
         * Two hard rules:
         * 1. `relations.children` (the static record keys from selectorToTree,
         *    mapped via ">") is NEVER touched — key relations stay intact.
         * 2. The walk STOPS at key boundaries: when it reaches an element owned
         *    by another registered key (e.g. @colorizer>mode living inside
         *    @colorizer>header), that element is recorded once in `elements`
         *    but is NOT descended into — it inventories itself under its own
         *    key, so nothing duplicates across layers.
         *
         * Same elementSelector format as DOMRenderer's attachMetadata.
         * Idempotent: `elements` is rebuilt (deduped) on every run, and
         * node.relations is kept pointed at the same object as the map.
         */
        update: () => Record<string, any>;
    };
    /**
   * 👑 THE SEPARATED HYDRATION VALVE (POS KEMENTERIAN PENGISIAN RAHIM DATA)
   * Murni hanya mengurusi penyemprotan teks data spesifik atomik,
   * terisolasi penuh, rapi, dan kebal dari bug hantu selamanya!
   */
    protected abstract template(typeKey: TType, el: HTMLElement, payload?: any, props?: iElementProperty): void;
    /**
     * @description
     * The public entry point for materializing a component tree from input data.
     * Subclasses implement this method to transform the incoming payload into a DOM fragment
     * or a structured collection of elements while preserving the shared builder lifecycle.
     *
     * @param content - The raw data payload or structural object delivered by the caller.
     * @param config - The resolved builder configuration used to shape the rendered output.
     *
     * @returns A fully hydrated DOM element or a record of DOM elements keyed by their logical role.
     *
     * @public
     */
    abstract prepare(content: any, config?: Required<TConfig>): HTMLElement | Record<string, any | HTMLElement>;
    /**
     * Runtime event-binding hook.
     * Triggered at the very end of the creation lifecycleto lock persistent browser click/drag/swipe
     * interactive listeners onto the completed DOM structure.
     */
    abstract initialize(el?: HTMLElement, payload?: any, context?: any): void;
    /**
     * 🪶 LOADING MOCKUP — what this component shows while its OWN sheet is missing.
     *
     * Optional, and called at most once per cold `create()`: only when the sheet this builder
     * declares is genuinely still on its way. Return a throwaway silhouette (a handful of
     * `data-skeleton` nodes) — never the real tree, never `this.render()`, never a loop over
     * the payload. The framework hides the real children, prepends the mockup, and restores
     * the children the moment the sheet lands, so this hook only has to describe a shape.
     *
     * @example
     * protected loading(): HTMLElement {
     *   const mock = document.createElement("div");
     *   mock.setAttribute("data-skeleton", "root");
     *   mock.innerHTML = '<div data-skeleton="bone" style="height: 8rem"></div>';
     *   return mock;
     * }
     *
     * @summary Buying a good silhouette: the alternative is a per-element placeholder pass,
     *   which knows the exact shape but also records every node and dominates the render
     *   budget. Skip this hook and the generic shimmer skin applies instead —
     *   `packages/styles/src/components.css` styles both, so the mockup never waits for the
     *   stylesheet it is standing in for.
     */
    protected loading?(content: any, config: TConfig): HTMLElement | null | undefined;
    constructor();
    /**
     * @description
     * Merges the component's default configuration with runtime overrides into a single
     * immutable configuration object. Selector maps are merged deeply so structural rules
     * and HTML attributes from the user config can augment the defaults without replacing
     * them wholesale.
     *
     * @param defaultOptions - The default structural configuration for the builder, including
     *   core properties and selector definitions.
     * @param userConfig - Incoming runtime overrides provided by the caller, theme layer,
     *   or framework controller.
     *
     * @returns A strictly typed, fully populated configuration object ready for runtime ingestion.
     *
     * @template C - The concrete child configuration type that extends the builder's base config.
     * @protected
     */
    protected resolveConfig<C extends TConfig>(defaultOptions: Required<C> | any, userConfig?: Partial<C>): Required<C>;
    /**
     * 🧩 Declared slots of this builder: `typeKey → slotKey` (see resolveConfig).
     * A declared key is a RECEPTACLE: at the end of create() its element is
     * stamped with `data-slot="slotKey"` and published to the slot ledger, ready
     * for another builder's `attach()`.
     */
    protected get slots(): Record<string, string>;
    /**
     * Receives the sub-modules the registry resolved for this component.
     *
     * Kept out of `config` on purpose: several components already own a
     * `config.modules` of their own, and `Required<iBuilderConfig>` would force
     * every default config to declare it.
     *
     * @param modules - Module id to resolved module.
     */
    provideModules(modules: Record<string, unknown>): void;
    /**
     * Resolves a sub-module declared in this component's manifest `modules`.
     *
     * A missing module is a normal state (LITE edition): it warns once and returns
     * `undefined`, letting the caller decide how to degrade.
     *
     * @param id - Module id as declared in the manifest, e.g. `validation`.
     * @returns The resolved module, or `undefined` when it is not available.
     */
    protected module<T = unknown>(id: string): T | undefined;
    setConfig(config: Partial<TConfig>): void;
    errorHandler(): void;
    /** 📦 NODE STORE — registri node milik instance ini: typeKey → record. */
    protected storage: {
        nodes: Map<string, iNodeRecordItem<any>>;
        proxy: WeakMap<any, any>;
    };
    protected proxyRuntime: BuilderProxy;
    protected setProxy(key: string, payload: any, onUpdateCallback?: (target: any, prop: string | symbol, value: any) => void): any;
    protected bindState(root: HTMLElement, source: any): void;
    /**
     * @description
     * Executes the full builder lifecycle from configuration resolution to DOM initialization.
     * The method resolves the effective configuration, derives a stable identity, clears prior
     * node state, renders the component tree, and calls the subclass initializer so interactive
     * bindings are attached only after the DOM has been materialized.
     *
     * @param content - The source data payload used to construct the component tree.
     * @param config - Optional runtime overrides merged into the builder configuration.
     *
     * @returns The root DOM element produced by the builder's prepare/initialize pipeline.
     *
     * @public
     */
    create(content: any, config?: Partial<TConfig>): HTMLElement;
    /**
     * @description
     * Creates and registers a DOM element for the requested selector token using the builder's
     * render pipeline. This method resolves the selector, applies base attributes, stores the
     * element in the local node registry, invokes the subclass template hook, and optionally wraps
     * the element in a structural wrapper chain defined by the selector configuration.
     *
     * The method is intentionally scoped around layout containers and repeating nodes. The actual
     * content injection is delegated to the subclass `template()` implementation so that each builder
     * can populate the container with its own internal structure.
     *
     * @param typeKey - The selector token that identifies the target node in the current builder.
     * @param payload - The runtime data payload associated with the node.
     * @param multiple - When true, the node is treated as a repeatable instance and can coexist
     *   with other records for the same selector token.
     *
     * @returns The created element, or undefined when the selector is not defined for the current builder.
     *
     * @protected
     */
    render(typeKey: TType, payload?: any): HTMLElement | undefined;
    protected load(key: TType): HTMLElement | null;
    protected payload(key: TType): any;
    /**
     * 🧩 HOST — find the receptacle element stamped for `slotKey` inside this builder's root.
     *
     * @param slotKey - slot name declared in this builder's config.slots.
     * @returns receptacle element if found, or null.
     */
    host(slotKey: string): HTMLElement | null;
    /**
     * 🧩 PROJECT — explicit slot door.
     *
     * Mounts a child DOM node or builder into a named slot of this host builder.
     * Replaces the slot receptacle, carries over receptacle classes and non-style
     * attributes, and keeps track of the displaced receptacle for later `detach()`.
     *
     * @param slotKey - slot name declared in this builder's config.slots.
     * @param child - child element or child Builder to project into the slot.
     * @param payload - optional payload passed to child's initialize() if child is Builder.
     * @returns the projected HTMLElement, or null if receptacle was not found.
     */
    project(slotKey: string, child: HTMLElement | Builder<any, any>, payload?: any): HTMLElement | null;
    /**
     * 🧩 ATTACH — project ONE of this builder's keys into a slot declared by the
     * caller's config (`slots`), and wire only that key.
     *
     * This is the default way a parent consumes a child:
     *
     *   const studio = new ColorThemeBuilder(config)
     *     .attach("@colorizer>configurator", "color-configurator")
     *     .attach("@colorizer>output", "color-output");
     *
     * No create(), so the rest of the child's tree is never built — only the keys
     * asked for. The key is rendered through the normal `render()` (so it lands in
     * the node store, `load(key)` keeps answering, and its own template() pulls in
     * the child keys that key is made of), then swapped in for the caller's
     * receptacle. The receptacle is found the cheap way: the caller's root key
     * anchors one `querySelector('[data-slot="…"]')` inside the caller's own tree.
     * Nothing is registered anywhere — `attach()` talks to `#caller`, the builder
     * that instantiated this one.
     *
     * Wiring is per-scope: initialize(node, payload) is what runs, so a builder
     * that wires by scope (see ColorTheme.initialize) binds exactly the attached
     * key — and attaching several keys to one instance keeps ONE state, ONE sync
     * effect and one binding per control (see `scopes()`).
     *
     * A builder without a caller (registry-built root / standalone page) keeps its
     * nodes in its own tree — that is the fallback, not an error.
     *
     * @param typeKey  key of this builder to project (a key of my selector map).
     * @param slotKey  slot declared by the caller's config.
     * @param payload  data this key's template() needs; omit it when the template
     *                 can derive what it needs from the builder's own state.
     * @returns the current builder for chaining.
     */
    attach(typeKey: TType, slotKey: string, payload?: any): this;
    /**
     * 🧷 DETACH — hand the caller its receptacle back and return the projected
     * node to its owner (still registered, ready to re-attach).
     *
     * @param slotKey  slot to release.
     * @returns current builder.
     */
    detach(slotKey: string): this;
    /**
     * 🔌 WIRING SCOPES — every DOM location this instance paints: the builder
     * root first, then each node projected into my caller's slot.
     *
     * This is what makes initialize()/sync slot-aware: a builder is exactly as
     * multi-rooted as its projections, so initialize() runs once for the root and
     * loops `scopes()`, while the reactive sync loop repaints every scope — that
     * is how a projected panel stays wired and in sync with the owner's state.
     */
    protected scopes(): HTMLElement[];
    /**
     * @description
     * Removes one or more registered nodes from the active builder instance in a single call.
     * The method detaches the underlying DOM elements from the page and clears the matching
     * records from the local node registry so the builder state stays consistent.
     *
     * @param typeKeys - One or more selector tokens whose live DOM nodes should be removed.
     *
     * @protected
     */
    protected remove(...typeKeys: TType[]): void;
    /**
     * @description
     * Cleans up the builder instance by notifying listeners, removing the root DOM element,
     * clearing the internal node registry, and releasing references held by the instance.
     * This method is the lifecycle termination point for a builder and should be invoked when
     * the component is unmounted or discarded.
     *
     * @param typeKey - Optional selector token used to target a specific root node for removal.
     *   When omitted, the builder attempts to remove the default container node.
     *
     * @public
     */
    destroy(typeKey?: TType): void;
    /**
     * Recursively parses CSS selector chains (e.g., ".column>neon", "div.col-4>.card-wrapper")
     * into a nested DOM hierarchy.
     */
    private _wrapElement;
    /**
     * 🧱 THE ATTR AND METADATA WELDER (POS PENGURUS DATA ATRIBUT)
     * Melumat tuntas ID, ClassName, kustom attrs, hingga data- attributes bawaan database Sheets.
     * Pair-stamping delegated to Utility/AttributeUtils.
     */
    private _applyNodeAttributes;
}
//# sourceMappingURL=Base.d.ts.map