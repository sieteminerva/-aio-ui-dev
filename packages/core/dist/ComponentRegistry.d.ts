import type { iBasicNode, iBuilderRegistry } from "./interface";
import type { iEventEmit } from "./types/events";
/**
 * Layered config for one build: `theme < emitter < manifest < node`.
 *
 * The emitter sits above the theme so every builder gets a publisher even when a theme
 * configured it, and below the manifest/node so a component can still set its own — or
 * silence it with `emit: null`. Selectors are merged across the three layers so a node
 * that overrides one key keeps the rest.
 *
 * Pure and exported: the merge is the one part of `build()` that can be pinned down
 * without a DOM.
 */
export declare function mergeBuildConfig(theme: Record<string, any> | undefined, emitter: iEventEmit | null, manifest: Record<string, any> | undefined, node: Record<string, any> | undefined): Record<string, any>;
/**
 * Component manifest — the single registration shape.
 *
 * A component package describes how to load itself and how to configure itself.
 * The registry never receives a class, an element, or a promise directly.
 */
export interface iComponentManifest {
    /** Module specifier or host path used to load the component module. */
    path: string;
    /** Stylesheet specifier. Derived from `path` when omitted and `path` is a file. */
    stylesheet?: string;
    /**
     * Named export holding *this* component's builder.
     *
     * A package that ships several builders (`@aio-ui/product` has card, grid and detail)
     * cannot be registered twice by pointing both words at the same `path`: without a name
     * the loader takes `default`, then the first exported function — so both words would
     * resolve to the same class. Naming the export is the only honest way to say which one
     * this registration means.
     */
    export?: string;
    /** Default configuration, merged beneath the node's own config. */
    config?: any;
    /** Payload handed to the builder. When omitted, the node content is used. */
    schema?: any;
    /** Sub-modules this component owns, loaded alongside it. */
    modules?: iComponentModuleRef[];
}
/** A sub-module a component declares (engine, adapter, adapter). */
export interface iComponentModuleRef {
    /** Stable id inside the owning component, e.g. `validation`. */
    id: string;
    /**
     * Module specifier. When omitted, `id` is treated as the name of another
     * registered component: its own manifest (path, stylesheet, nested modules) is
     * honoured, so a component registered standalone works as a sub-module without
     * being declared again.
     */
    path?: string;
    /**
     * Named export to take from the module. Adapters and handlers are usually one
     * export among several; without this the registry picks `default`, then the
     * first exported function, then the namespace object.
     */
    export?: string;
    /**
     * Which slot or role inside the component this module fills.
     *
     * @summary Free-form on purpose — the registry does not care, the component does.
     * In a page-level or composite component, `scope` names the slot or role this module
     * targets (e.g. `form` → `"adapter"`, `product` → `"grid"` / `"detail"`).
     * A component that nests another builder (`form` → `input`) uses it to route a
     * resolved module to the right preset instead of dumping everything into one bag:
     * `"input"` modules become the field-level adapter set, `"form"` (or omitted) the
     * component's own. The module `id` stays authoritative; `scope` documents intent and slot mapping.
     */
    scope?: string;
    stylesheet?: string;
    config?: any;
}
/**
 * One registration signature, no variants: every entry returns a manifest.
 */
export type RegisterFn<K extends keyof iBuilderRegistry> = (data: iBuilderRegistry[K]) => iComponentManifest;
/**
 * Asset loader maps supplied by the HOST application.
 *
 * `import.meta.glob` resolves patterns relative to the application that declares
 * them, so a reusable package cannot own these maps: the keys belong to the host
 * layout. The host passes both maps in the constructor, which also lets a
 * generated project point at its own component directory.
 */
export interface iComponentAssetMaps {
    /** Script loaders keyed by Vite module path, e.g. `/src/lib/Components/Table/Table.ts`. */
    modules: Record<string, () => Promise<any>>;
    /** Inline stylesheet loaders keyed by Vite CSS path. */
    styles: Record<string, () => Promise<any>>;
}
/**
 * Collects the component names a page source needs, in discovery order.
 *
 * Two shapes are recognised:
 *
 * - node trees: a `builder` field naming **one** component — the node the renderer
 *   builds. A route that mounts several components declares them on the registry
 *   (`iComponentRoute` in `@aio-ui/app`), not on a node;
 * - page blocks: a `type` field paired with a table binding (`{ type: "masonry",
 *   source: "portfolio" }`). The `source` requirement keeps input descriptors out,
 *   because they also carry a `type` (`{ type: "text" }`) that is not a component.
 *
 * `builder` is a reserved key, so a declaration there can never leak into the DOM.
 *
 * The walk is depth-first, cycle-safe, and ignores everything it does not recog-
 * nise, so it can be run on raw CMS output without validation.
 *
 * @param source - Page content, array, or any nested structure.
 * @returns Unique component names, in the order they were first seen.
 */
export declare function collectComponentNames(source: unknown): string[];
export declare class ComponentRegistry {
    #private;
    /** Slot this class fills when registered as an app module. */
    static readonly slot: "registry";
    /**
     * 🧱 Builder storage backed by the generic registry kernel.
     *
     * `duplicate: "replace"` preserves the previous silent-overwrite behaviour
     * that HMR and preset rebuilds depend on. Lazy loading and stylesheet injection
     * stay in this adapter — the kernel only stores values. The anti-FOUC hold is
     * not here: it belongs to the builder that owns the root.
     */
    private builders;
    /**
     * @summary Stores the host asset maps used for every lazy component load.
     * @param assets - Vite glob maps declared by the host application.
     *
     * The style map is also published to the shared stylesheet seam, so a component
     * built *outside* the registry (a table inside a form field) can still get its CSS
     * without importing it — a static CSS import would ride along in the JS chunk and be
     * injected twice.
     */
    constructor(assets: iComponentAssetMaps);
    /**
     * Attaches the publisher every subsequent build receives.
     *
     * Optional by design: a host without an event bus never calls it, and the configs it
     * builds simply have no `emit`. Passing `null` detaches.
     *
     * @param emit - Publisher, or `null` to stop forwarding component events.
     * @returns The current registry instance.
     */
    useEmitter(emit: iEventEmit | null): this;
    private registeredSheets;
    private _resolvedCache;
    /** Sub-modules resolved per component name: `componentName → { moduleId → module }`. */
    private _modules;
    private _dynamicConfigs;
    /** Components currently being loaded, so a `modules` cycle cannot recurse forever. */
    private _loading;
    /**
     * Registers a component factory under a stable name.
     *
     * @summary Delegates storage to the registry kernel, then returns this instance for fluent registration.
     * @param name - Public component identifier.
     * @param builderFn - Polymorphic registration function (direct builder, loadable builder, or manifest).
     * @returns The current registry instance.
     * @example
     * registry.register("masonry", masonryBuilder);
     */
    register<K extends keyof iBuilderRegistry>(name: K, builderFn: RegisterFn<K>): this;
    /**
     * Lists every registered component name.
     *
     * @summary Exposes the kernel's insertion-ordered ids so callers can preload components.
     * @returns Registered component names in registration order.
     */
    getRegisteredNames(): string[];
    /**
     * Resolves a registered component factory.
     *
     * @summary Returns `undefined` for unknown names so legacy call sites that test the result keep working.
     * @param name - Public component identifier.
     * @returns The registration function, or `undefined` when the name is not registered.
     */
    get(name: string): RegisterFn<any> | undefined;
    /**
     * Checks whether a component name is registered.
     *
     * @param name - Public component identifier.
     * @returns `true` when a factory is registered under `name`.
     */
    has(name: string): boolean;
    private loadModule;
    /**
     * Resolves every component a page source needs, without the caller listing them.
     *
     * This is the default entry point: a route only has to hand over its content,
     * and the registry derives the set itself (see `collectComponentNames`). `load()`
     * stays public for callers that already know the names, or need query data.
     *
     * @param source - Page content, block list, or any nested structure.
     * @returns The component names that were resolved, in discovery order.
     */
    loadFor(source: unknown): Promise<string[]>;
    /**
     * Derives the component names a source needs, without loading anything.
     *
     * Exposed so a host (for example `@aio-ui/app`) can inspect a route before the
     * render pass without importing `collectComponentNames` directly — that keeps the
     * dependency between app and core type-only at runtime.
     *
     * @param source - Page content, block list, or any nested structure.
     * @returns Unique component names, in discovery order.
     */
    collect(source: unknown): string[];
    /**
     * Resolves component modules and stylesheets ahead of a render pass.
     *
     * Paired with `build()`: `load()` is always asynchronous and fills the resolved
     * cache, while `build()` stays synchronous and reads from it. A component that
     * was never loaded cannot be built.
     *
     * @param componentNames - Registered component names to resolve.
     * @param pagesData - Source tree used to find each component's node config.
     */
    load(componentNames: string[], pagesData?: any[]): Promise<void>;
    /**
     * Resolves the sub-modules a component declares in its manifest.
     *
     * Each module is cached under a namespaced key (`form:table`) so a module id
     * shared by two components never collides. A module that cannot be resolved is
     * reported and skipped: the component still loads, and `Builder.module(id)`
     * decides how to degrade at use time.
     *
     * @param componentName - Owner of the modules.
     * @param manifest - The component manifest that declares them.
     */
    private loadModules;
    /**
     * ⚡ AMAN & SINKRONUS MURNI (.run Method)
     */
    build<K extends keyof iBuilderRegistry>(name: K, data: any): HTMLElement;
    private injectStyle;
    /**
     * 🎯 Penanam CSS mentah sebagai elemen <style id="…"> NYATA di <head>.
     *
     * Mengapa tidak lagi mengandalkan Constructable Stylesheet
     * (document.adoptedStyleSheets)? Stylesheet yang di-`adopt` TIDAK muncul
     * sebagai node DOM — Anda buka DevTools > Elements, cari <style>/<link>,
     * tidak ada → tampak "stylesheet tidak loaded" padahal sesungguhnya CSS
     * sudah ter-pakai. Elemen <style> nyata membuat inject gampang diverifikasi.
     *
     * Selain itu ini juga lebih andal daripada jalur CSSOM: beberapa browser
     * melempar SyntaxError dari replaceSync pada CSS modern mentah (nesting,
     * @starting-style, ::picker, position-area, dst) — yang dulu membuat
     * stylesheet diam-diam TIDAK pernah masuk DOM sama sekali.
     *
     * Id `<style>` dan dedupe-nya milik seam bersama (`Stylesheets`), sehingga
     * komponen yang dibangun DI LUAR registry (tabel di dalam field form) memakai
     * jalur injeksi yang sama dan tidak pernah menghasilkan style ganda.
     */
    private injectCssString;
    setConfig(builderName: keyof iBuilderRegistry, newConfig: Record<string, any>): void;
    clear(): void;
    destroy(): void;
    /**
     * Destroys every builder pinned inside a subtree the app is about to replace.
     *
     * @param root - The outgoing shell (or any subtree a page remembers).
     * @returns How many builder instances were destroyed.
     *
     * @summary The registry is where instances are created, so it is the natural door for
     *   releasing them: `AioApp` calls this on the tree it is about to swap out, and a page
     *   controller can call it from `onDestroy()` with its own shell. Idempotent — a
     *   builder is unpinned before its `destroy()` runs, so a second sweep does nothing.
     */
    releaseBuilders(root: ParentNode | null | undefined): number;
    getBuilderNode(nodes: iBasicNode[] | iBasicNode, name: string, visited?: Set<unknown>): iBasicNode | undefined;
}
//# sourceMappingURL=ComponentRegistry.d.ts.map