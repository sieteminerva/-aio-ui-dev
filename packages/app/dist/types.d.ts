/**
 * Application shell contracts.
 *
 * A shell turns a source description (pages, menu, footer) into a live routed
 * application: it derives which components a page needs, preloads them, renders
 * the page, swaps the root element, and runs page lifecycle hooks.
 *
 * The shape is deliberately narrow. Whatever the shell must know is declared
 * here; anything else belongs to a package it receives through `iAppDeps`.
 */
import type { iBasicNode, iNodeContent } from "@aio-ui/core/node";
import type { iThemeModule } from "@aio-ui/core/page";
import type { iAnimationPort, iAppRouteState, iComponentRegistryPort, iEventPort, iHttpPort, iRendererPort, iRouterPort, iStoragePort } from "./ports";
/**
 * One piece of a page.
 *
 * A block is either static (its `props` are the content) or bound to a table
 * (`source` names a sheet, and the renderer receives the fetched records).
 */
export interface iPageBlock {
    id?: string;
    /** Component name, resolved through the component registry. */
    type: string;
    /** Static content for this block. Ignored when `source` is set. */
    props?: unknown;
    /** Sheet name to fetch records from. Records are passed as the block payload. */
    source?: string;
    /** Query overrides forwarded to the table endpoint. */
    query?: Record<string, string | number>;
    children?: iPageBlock[];
    className?: string;
    attrs?: Record<string, string>;
}
/** One route of the application, as authored by the preset or the editor. */
export interface iPageDocument {
    route: string;
    title?: string;
    theme?: string;
    blocks: iPageBlock[];
    meta?: Record<string, unknown>;
}
/**
 * Content of one route.
 *
 * Two shapes are accepted because the same shell must serve both editions:
 *
 * - a **node tree** (`iNodeContent`) — what a hand-written LITE page is. The
 *   renderer understands it as-is, so nothing is transformed on the way in.
 * - a **page document** (`iPageDocument`) — a list of blocks. Generated projects
 *   get this straight from an editor or a CMS; the shell converts each block into
 *   a builder root before rendering.
 *
 * Detection is structural (`Array.isArray(page.blocks)`), not nominal, so a plain
 * object coming from JSON works without being branded.
 */
export type iPageContent = iNodeContent | iPageDocument;
/**
 * Source of truth for the application content.
 *
 * In the LITE edition this is written by hand (`src/content/*`). In a generated
 * project it is produced by transforming the CMS response into page documents.
 *
 * `menu` and `footer` are optional slots. A hand-written page tree normally
 * already contains its own nav and footer, so leaving the slots empty keeps the
 * authored DOM untouched; a generated project fills them and the shell wraps the
 * page with them.
 */
export interface iAppSource {
    /** Route name to page content. Keys are normalised (trim, no `#`, lower case). */
    pages: Record<string, iPageContent>;
    menu?: iBasicNode | HTMLElement | null;
    footer?: iBasicNode | HTMLElement | null;
}
/**
 * What one route mounts, declared once beside the registry.
 *
 * This is a **preload plan**, not a dependency list on a node: `builder` on a node names
 * the component that node *is*, and nothing else. A component that only mounts others
 * (a page-level component composing its sub-modules) carries no `builder` and names them
 * here instead.
 *
 * ```ts
 * app.registerModule(components, [
 *   { route: "article", components: ["article", "fab-menu"] },
 * ]);
 * ```
 *
 * Keys are normalised like `iAppSource.pages` (trim, no `#`, lower case), so
 * `"Article"` and `"#article"` land on the same entry; repeated declarations for one route
 * merge instead of replacing. A plan handed to any slot other than `registry` throws at
 * registration, because resolving components is what that slot does.
 */
export interface iComponentRoute {
    /** Route this plan belongs to (normalised). */
    route: string;
    /** Registry words the route needs preloaded. */
    components: string[];
}
/** Construction options that are not content. */
export interface iAppOptions {
    /** Mount point, resolved once at `render()`. */
    container: HTMLElement | string;
    /** Route used when the hash is empty or invalid. Defaults to `home`. */
    defaultRoute?: string;
    /** Initial theme id. Defaults to `default`. */
    theme?: string;
    /** Enables the app debug channel (resolved slots, preload graph, misses). */
    debug?: boolean;
}
/**
 * Full configuration: content and general options only.
 *
 * Module configuration is **not** here. Each module carries its own config at the
 * place it is registered (`registerModule(Module, config)`), so this interface
 * stays stable no matter how many modules an application installs.
 */
export interface iAppConfig extends iAppOptions {
    source: iAppSource;
}
/**
 * Ports the app resolves from registered modules, keyed by the role they play.
 *
 * A module declares which slot it fills, so a module registered for the wrong
 * role is rejected by the type system instead of failing at runtime.
 */
export interface iAppSlots {
    registry: iComponentRegistryPort;
    router: iRouterPort;
    renderer: iRendererPort;
    animation: iAnimationPort;
    events: iEventPort;
    http: iHttpPort;
    storage: iStoragePort;
    theme: iThemePort;
}
/** Slot name, for example `"router"`. */
export type iAppSlot = keyof iAppSlots;
/**
 * Runtime data a module may need while it is being created.
 *
 * This is the injection point that makes `registerModule(HashRouter, …)`-style
 * registration possible: a router is constructed with the routes and the change
 * callback that only the app knows, so the app hands them over here.
 */
export interface iAppModuleContext {
    /** Normalised route names, in source order. */
    routes: string[];
    /** Route used when the hash is unknown. */
    defaultRoute: string;
    /** Theme to start with — already restored from storage when one is registered. */
    theme: string;
    /** Whether the app debug channel is on. */
    debug: boolean;
    /** Callback the router must call whenever the hash changes. */
    onRouteChanged: (state: iAppRouteState) => void | Promise<void>;
}
/**
 * A module **class** — the class itself is the token.
 *
 * Two members are the whole convention:
 *
 * ```ts
 * export class HashRouter {
 *   static readonly slot = "router" as const;
 *   constructor(config?: iHashRouterConfig, context?: iHashRouterContext) { … }
 * }
 *
 * app.registerModule(HashRouter);
 * ```
 *
 * - `slot` says which port the class becomes, so a class registered for the wrong
 *   role is rejected by the type system instead of failing at runtime;
 * - the constructor receives `(config, context)`. `config` is whatever the caller
 *   passed as the second argument of `registerModule`; `context` is filled by the
 *   app. A class that needs neither simply ignores the parameters.
 *
 * No wrapper class, no `defineModule()` alias, no factory object.
 */
export interface iAppModuleClass<K extends iAppSlot = iAppSlot> {
    /** Slot this class fills. */
    readonly slot: K;
    /** Builds the port. Called once, during `render()`, with the registered config. */
    new (...args: any[]): iAppSlots[K];
}
/** Context passed to a page controller when the app instantiates it. */
export interface iPageContext {
    /** Route being rendered (normalised). */
    route: string;
    /** Content declared in `iAppSource.pages`, or `null` when the controller owns it. */
    page: iPageContent | null;
    /** Deep-link fragment, for example `post-2` from `#blog/post-2`. */
    fragment: string;
    /** Theme id the router resolved for this visit. */
    theme: string;
    /** Component names derived from the declared content, before anything is loaded. */
    builders: string[];
    /** The only supported way to load data. */
    http: iHttpPort;
    /** Aborted when the visitor navigates away before the page finished preparing. */
    signal: AbortSignal;
}
/** Context handed to a controller after its page is attached to the DOM. */
export interface iPageReadyContext {
    route: string;
    /** The page that ended up rendered — from `source.pages` or from `onPrepare`. */
    page: iPageContent;
    /** Mounted root: the page itself, or the wrapper when menu/footer slots exist. */
    shell: HTMLElement;
    /** Menu element, only when the source declares a menu slot. */
    menu: HTMLElement | null;
    /** Footer element, only when the source declares a footer slot. */
    footer: HTMLElement | null;
    /** Every rendered element that carries an `id`, keyed by that id. */
    blocks: Map<string, HTMLElement>;
}
/**
 * Per-route behaviour.
 *
 * A controller never renders anything itself. It prepares (or fetches) the page
 * tree before the render pass, may rewrite the menu node, and observes the result
 * afterwards. One instance is created per render, so `onDestroy` genuinely releases
 * what `onPrepare` acquired.
 */
export interface iPageController {
    /**
     * Runs once per render, before preload. Returns the page to render.
     *
     * When it returns nothing, the page declared in `iAppSource.pages` is used. When
     * neither exists, the render fails with an explicit message.
     */
    onPrepare?(context: iPageContext): iPageContent | void | Promise<iPageContent | void>;
    /** Runs after the page is attached to the DOM. */
    onReady?(context: iPageReadyContext): void;
    /** Runs before the route's DOM is replaced, or when the app is destroyed. */
    onDestroy?(): void;
    /** May rewrite the menu node before it is rendered. Called by the app, not by the controller. */
    attachMenu?(menu: iBasicNode): iBasicNode;
}
/**
 * Route definition inside a page-level component.
 */
export interface iPageRouteSpec {
    /** Relative sub-path, e.g. `""` (root) or `":uid"` (parameter). */
    path: string;
    /** View role or slot to activate for this path, e.g. `"grid"` or `"detail"`. */
    view: string;
}
/**
 * Slot declaration in a page-level component.
 */
export interface iPageSlotSpec {
    /** Name of the slot receptacle, e.g. `"grid"`, `"detail"`. */
    slot: string;
    /** Role or description for tooling. */
    role?: string;
}
/**
 * Data requirement descriptor for a page-level component.
 */
export interface iPageDataSpec {
    /** Identifier within `ctx.data`, e.g. `"catalog"`. */
    id: string;
    /** Data source / table / sheet name. */
    sheet?: string;
    /** Static records or initial query. */
    query?: Record<string, any>;
}
/**
 * Event contract for a page-level component.
 */
export interface iPageEventSpec {
    emits?: string[];
    listens?: string[];
}
/**
 * Page port handed to a page-level component controller.
 *
 * Shell keeps control: this grants exactly what the shell decides,
 * without raw `history`, `fetch`, or unrestrained DOM access.
 */
export interface iPagePort {
    /** Full current route id. */
    route: string;
    /** Sub-route path matched within the page. */
    subPath: string;
    /** Route params extracted from `:param` pattern. */
    params: Record<string, string>;
    /** Fragment / deep-link query. */
    fragment: string;
    /** Data loaded according to `definition.data`. */
    data: Record<string, any>;
    /** Navigate safely through the shell router. */
    navigate: (route: string, fragment?: string) => void;
    /** Build a registered component safely via the shell registry. */
    build: (name: string, data: any) => HTMLElement;
    /** Isolated event port scoped to this page. */
    events: iEventPort;
    /** Abort signal cancelled when leaving the page. */
    signal: AbortSignal;
}
/**
 * Declarative definition of a page-level component.
 */
export interface iPageDefinition {
    /**
     * Route this definition owns, e.g. `"product"`. Normalised like `iAppSource.pages` keys,
     * so `"Product"` and `"#product"` land on the same entry.
     */
    route: string;
    /**
     * Registry word of the root builder, e.g. `"product"`. Omit it when the page tree comes
     * from `iAppSource.pages`; then nothing is built from the definition itself.
     */
    builder?: string;
    /** Sub-routes mapped to views. */
    routes?: iPageRouteSpec[];
    /** Slots declared by the root builder. */
    slots?: iPageSlotSpec[];
    /** Exclusive sub-module refs passed to the registry. */
    modules?: any[];
    /** External registry words to preload when entering this page. */
    requires?: string[];
    /** Data descriptors to resolve for this page. */
    data?: iPageDataSpec[];
    /** Events emitted or listened to by this page. */
    events?: iPageEventSpec;
    /** Optional custom controller or lifecycle hook for this page definition. */
    controller?: new (port: iPagePort) => void | {
        onReady?(shell: HTMLElement): void;
        onDestroy?(): void;
    };
}
/** A page controller class; the route is given at registration, not by the class. */
export interface iPageControllerClass<C = unknown> {
    new (config: C, context: iPageContext): iPageController;
}
/**
 * What the app asks a theme for.
 *
 * A theme is a slot, not an event subscriber: the app calls `prepare` before the DOM is
 * built, `activate` right after it is attached, and `deactivate` before the page is
 * replaced. That answers "who applies the theme" without making the entry know any
 * theme, and without a listener that has to guess when to run.
 */
export interface iThemePort {
    /** Structural hook: may return a different page tree (same reference is fine). */
    prepare(page: iPageContent, route: string, themeId: string): iPageContent;
    /** Behavioural hook: runs once the page is live. */
    activate(shell: HTMLElement, blocks: Map<string, HTMLElement>, route: string): void;
    /** Cleanup hook: runs before the live page is replaced or the app is destroyed. */
    deactivate?(shell: HTMLElement): void;
    /** Applies a theme id selected after mount (the router reported a new theme). */
    use?(themeId: string): void;
    /** Adds a theme after the port exists. Optional: a host port may be read-only. */
    register?(theme: iThemeModule): void;
    /** Registered theme ids, when the port can enumerate them. */
    readonly ids?: string[];
    /** Currently applied theme id, when the port tracks it. */
    readonly current?: string;
}
/**
 * Theme controls on the app: `app.theme.register(...)`, `app.theme.use(...)`.
 *
 * Namespaced on purpose. `registerModule` answers "which object fills which slot" and
 * `registerPage` answers "who renders which route"; both are structural. Adding a theme is
 * neither — it adds an item to a collection that already has an owner — so it gets a
 * collection-shaped door instead of a third `register*` method on the app.
 */
export interface iAppThemeFacade {
    /**
     * Adds a theme. Safe before or after `render()`; a pre-mount call is queued and applied
     * once the theme port exists.
     */
    register(theme: iThemeModule): iApp;
    /**
     * Switches the active theme and re-renders the current route. Routed through the router
     * when there is one, so the address bar and the persisted choice stay truthful.
     */
    use(themeId: string): void;
    /** Ids the port knows about (empty when the port cannot enumerate). */
    readonly ids: string[];
    /** Active theme id. */
    readonly current: string;
}
/** Public surface of a mounted app. */
export interface iApp {
    /** Route currently rendered. */
    readonly currentRoute: string;
    /** Root element of the mounted page, `null` before `render()`. */
    readonly shell: HTMLElement | null;
    /** Theme controls — `register(theme)` / `use(id)`. See `iAppThemeFacade`. */
    readonly theme: iAppThemeFacade;
    /**
     * Registers the module that fills a slot. Must be called before `render()`.
     *
     * Two shapes, one rule — the class (or instance) declares `slot`:
     *
     * ```ts
     * app.registerModule(HashRouter);                    // class, no config
     * app.registerModule(AppStorage, { driver });        // class + config
     * app.registerModule(components);                    // instance you already assembled
     * ```
     *
     * @param module - Module class, or an already-built port instance.
     * @param config - Configuration owned by that module, never by `iAppConfig`.
     */
    registerModule<M extends iAppModuleClass>(module: M, config?: ConstructorParameters<M>[0]): iApp;
    registerModule(instance: iAppSlots[iAppSlot], slot?: iAppSlot): iApp;
    /**
     * Renders the app: resolves the container, creates the modules and paints the route the
     * URL points at. It runs once — later changes go through the router.
     *
     * Named `render` rather than `mount` because nothing pre-existing is being attached: this
     * is where the source description plus the URL become a live DOM tree.
     */
    render(): Promise<void>;
    /** Navigates to a route through the router. */
    navigate(route: string): void;
    /** Registers a controller for a route, or registers a declarative page definition. */
    registerPage<M extends iPageControllerClass>(route: string, controller: M, config?: ConstructorParameters<M>[0]): iApp;
    registerPage(definition: iPageDefinition): iApp;
    /** Releases modules in reverse registration order and unmounts the page. */
    destroy(): void;
}
//# sourceMappingURL=types.d.ts.map