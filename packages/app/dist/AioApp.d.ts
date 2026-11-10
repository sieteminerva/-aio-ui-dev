/**
 * The standard application shell.
 *
 * One class that owns every mandatory step of a routed application, so an entry
 * file never has to write them again:
 *
 *   container ─► router ─► prepare (controller) ─► derive names ─► preload
 *             ─► render ─► swap root ─► title/theme/fragment ─► animate ─► onReady
 *
 * The shell knows *no* component, *no* route content and *no* concrete module:
 * everything arrives through `iAppConfig`. That is what makes it usable by a
 * hand-written LITE project and by a generated project without a code change.
 *
 * Design rules this class enforces:
 *
 * - **The shell owns the mount point.** The container element survives a route
 *   change; only its children are replaced. A page tree never renders `#app`
 *   itself, otherwise the host markup and the content would fight over one id.
 * - **A render is cancellable.** Every pass takes a sequence number; a newer
 *   navigation makes the older one drop its result instead of flashing old DOM.
 * - **A failure never breaks the page.** Errors are reported on the event port and
 *   leave the previous DOM mounted.
 * - **A missing component is a normal state.** Names that the registry does not
 *   know are skipped and reported, never thrown (the LITE promise).
 */
import type { iBasicNode, iNodeContent } from "@aio-ui/core/node";
import type { iApp, iAppConfig, iAppModuleClass, iAppSlots, iAppSlot, iAppThemeFacade, iPageBlock, iPageContent, iPageControllerClass, iPageDocument } from "./types";
/** Canonical route key: trimmed, no leading `#`, no trailing slash, lower case. */
export declare function normalizeRoute(route: unknown, fallback?: string): string;
/** A page document is recognised by its `blocks` list; anything else is a node tree. */
export declare function isPageDocument(value: unknown): value is iPageDocument;
/**
 * Converts one block into a renderer node.
 *
 * A block is a component plus its payload, so it becomes a builder root. Only
 * keys the renderer reserves are emitted — a `source`/`query` binding is never
 * copied into the node, because the renderer would turn it into an attribute.
 * Filling a tabled block with records is the job of a controller (`onPrepare`)
 * or of a CMS transformer; the shell itself never fetches.
 */
export declare function blockToNode(block: iPageBlock): iBasicNode;
/** Normalises any page content into a node tree the renderer understands. */
export declare function pageToNode(page: iPageContent, route?: string): iNodeContent;
export declare class AioApp implements iApp {
    #private;
    constructor(config: iAppConfig);
    /**
     * Theme controls: `app.theme.register(theme)` and `app.theme.use(id)`.
     *
     * A namespace rather than another `register*` method, because adding a theme does not
     * fill a slot or own a route — it appends to a collection that already has an owner.
     * `register()` works before or after `render()`; `use()` re-renders the current route
     * through the router so the URL and the stored choice stay truthful.
     */
    get theme(): iAppThemeFacade;
    /** Route currently rendered. Empty until `render()` finishes. */
    get currentRoute(): string;
    /** Root element of the mounted page, `null` before `render()`. */
    get shell(): HTMLElement | null;
    /** Route list derived from content and controllers — what the router validates. */
    get routes(): string[];
    /** Registers per-route behaviour. Registering the same route twice replaces it. */
    registerPage<M extends iPageControllerClass>(route: string, controller: M, config?: ConstructorParameters<M>[0]): iApp;
    /**
     * Registers the module that fills a slot.
     *
     * Acceptance covers both shapes with one rule: **the module declares its slot**.
     *
     * ```ts
     * app.registerModule(HashRouter);                 // class, no config
     * app.registerModule(AppStorage, { driver });     // class + config
     * app.registerModule(components);                 // instance you already assembled
     * app.registerModule(fakeRouter, "router");       // plain object / test double
     * ```
     *
     * Nothing is instantiated here: a class is constructed during `render()`, because a
     * module may need the route list, the restored theme or the change callback, which
     * do not exist yet. Registering the same slot twice replaces the earlier module and
     * says so, because that is almost always a mistake in a generated project.
     *
     * @param module - Module class, or an already-built port instance/object.
     * @param config - Class: the constructor config. Instance: the slot to fill, when
     *   the object has no `constructor.slot` (plain literal, factory result, proxy).
     * @returns The app, for a fluent chain.
     * @throws {Error} When called after `render()`, or when no slot can be determined.
     */
    registerModule<M extends iAppModuleClass>(module: M, config?: ConstructorParameters<M>[0]): iApp;
    registerModule(instance: iAppSlots[iAppSlot], slot?: iAppSlot): iApp;
    /**
     * Resolves the container, creates the registered modules and renders the route the URL
     * already points at.
     *
     * `render`, not `mount`: this call does not attach something that already exists — it is
     * the entry point that turns a source description plus a URL into a live DOM tree. It runs
     * once; later route changes go through the router.
     *
     * Modules are created here, not at registration, because a module may need data that only
     * exists at this moment (the route list, the restored theme, the change callback).
     */
    render(): Promise<void>;
    /** Navigates through the router so the URL stays the single source of truth. */
    navigate(route: string, fragment?: string): void;
    /** Runs controller teardown, cancels in-flight work, releases modules, unmounts. */
    destroy(): void;
}
//# sourceMappingURL=AioApp.d.ts.map