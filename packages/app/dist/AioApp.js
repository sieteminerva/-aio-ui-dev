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
/** Storage key of the persisted theme id. Kept identical to the legacy key. */
const THEME_STORAGE_KEY = "active_theme";
/** Class added to the wrapper the shell creates when it owns menu/footer slots. */
const SHELL_CLASS = "aio-shell";
/** Placeholder entry-file fallback. */
const DEFAULT_ROUTE = "home";
/** Slots that must be registered before `render()` can run. */
const REQUIRED_SLOTS = ["registry", "router", "renderer"];
// ====================================================
// 1. PURE HELPERS (exported so callers and tests can use them)
// ====================================================
/** Canonical route key: trimmed, no leading `#`, no trailing slash, lower case. */
export function normalizeRoute(route, fallback = DEFAULT_ROUTE) {
    const value = typeof route === "string"
        ? route.trim().replace(/^#+/, "").replace(/\/+$/, "")
        : "";
    return (value || fallback).toLowerCase();
}
/** A page document is recognised by its `blocks` list; anything else is a node tree. */
export function isPageDocument(value) {
    return !!value && typeof value === "object" && Array.isArray(value.blocks);
}
/**
 * Converts one block into a renderer node.
 *
 * A block is a component plus its payload, so it becomes a builder root. Only
 * keys the renderer reserves are emitted — a `source`/`query` binding is never
 * copied into the node, because the renderer would turn it into an attribute.
 * Filling a tabled block with records is the job of a controller (`onPrepare`)
 * or of a CMS transformer; the shell itself never fetches.
 */
export function blockToNode(block) {
    const node = { builder: block.type, isRoot: true };
    if (block.id)
        node.id = block.id;
    if (block.className)
        node.className = block.className;
    if (block.attrs)
        node.attrs = block.attrs;
    const children = Array.isArray(block.children) && block.children.length
        ? block.children.map(blockToNode)
        : undefined;
    const payload = children ?? block.props;
    if (payload !== undefined)
        node.content = payload;
    return node;
}
/** Normalises any page content into a node tree the renderer understands. */
export function pageToNode(page, route = "") {
    if (!isPageDocument(page))
        return page;
    const id = page.route || route;
    const node = {
        tagName: "main",
        className: id ? `page route-${id}` : "page",
        content: (page.blocks ?? []).map(blockToNode),
    };
    if (page.theme)
        node.attrs = { "data-theme": page.theme };
    return node;
}
/** Resolves a container from a selector or an element, failing fast. */
function resolveContainer(target) {
    const element = typeof target === "string" ? document.querySelector(target) : target;
    if (!(element instanceof HTMLElement)) {
        throw new Error(`[AioApp] Container not found: ${String(target)}`);
    }
    return element;
}
/**
 * Wraps the page in a shell, but only when the source declares menu/footer slots.
 *
 * A LITE page tree usually carries its own nav and footer, so the page itself stays the
 * root and the authored DOM remains byte-identical.
 */
function assembleShell(menu, page, footer) {
    if (!menu && !footer)
        return page;
    const shell = document.createElement("div");
    shell.className = SHELL_CLASS;
    if (menu)
        shell.appendChild(menu);
    shell.appendChild(page);
    if (footer)
        shell.appendChild(footer);
    return shell;
}
/** What `ctx.http` is when no data module was registered: a failure with a hint, not a crash. */
const NO_HTTP = {
    get: () => Promise.reject(new Error('[AioApp] No module registered for slot "http" (HttpService).')),
    post: () => Promise.reject(new Error('[AioApp] No module registered for slot "http" (HttpService).')),
};
/**
 * Creates the port for one slot.
 *
 * An instance registration is used as-is; a class registration is constructed with
 * `(config, context)` — the single constructor rule of the module convention.
 */
function createPort(slot, registration, context) {
    if (!registration.module)
        return registration.instance;
    try {
        return new registration.module(registration.config, context);
    }
    catch (error) {
        throw new Error(`[AioApp] Failed to create module for slot "${slot}": ${error.message}`);
    }
}
// ====================================================
// 2. THE SHELL
// ====================================================
export class AioApp {
    #source;
    #containerTarget;
    #defaultRoute;
    #initialTheme;
    #debug;
    /** Route content keyed by normalised route name; built once at construction. */
    #pages = new Map();
    /** Registered modules, keyed by slot. Insertion order is creation order. */
    #registrations = new Map();
    /**
     * Page behaviour, keyed by route.
     *
     * Separate from `#pages` (content) on purpose: a route may have content, a
     * controller, or both. One of the two must supply the page.
     */
    #controllers = new Map();
    /** Controller created for the current render pass. */
    #active = null;
    /** Cancels work of the previous pass when navigation moves on. */
    #abort = null;
    /**
     * Ports created for this app, keyed by slot.
     *
     * One store instead of eight parallel fields: adding a slot used to mean editing the
     * declaration, the creation `if/else`, the `#portOf` switch and the teardown block — and
     * forgetting one of them left a port running. The getters below keep every call site
     * reading `this.#registry?.…`, so the storage can change shape without churn.
     */
    #ports = new Map();
    get #registry() {
        return this.#ports.get("registry") ?? null;
    }
    get #router() {
        return this.#ports.get("router") ?? null;
    }
    get #renderer() {
        return this.#ports.get("renderer") ?? null;
    }
    get #animation() {
        return this.#ports.get("animation") ?? null;
    }
    get #events() {
        return this.#ports.get("events") ?? null;
    }
    get #storage() {
        return this.#ports.get("storage") ?? null;
    }
    get #themes() {
        return this.#ports.get("theme") ?? null;
    }
    /** Data access degrades to a loud stub instead of `undefined` at the call site. */
    get #http() {
        return this.#ports.get("http") ?? NO_HTTP;
    }
    #container = null;
    #root = null;
    #route = "";
    #theme;
    #fragment = "";
    #sequence = 0;
    #rendered = false;
    /** Themes registered through `app.theme.register()` before the port existed. */
    #pendingThemes = [];
    constructor(config) {
        this.#source = config.source ?? { pages: {} };
        this.#containerTarget = config.container;
        this.#defaultRoute = normalizeRoute(config.defaultRoute);
        this.#initialTheme = config.theme || "default";
        this.#theme = this.#initialTheme;
        this.#debug = config.debug === true;
        for (const [route, page] of Object.entries(this.#source.pages ?? {})) {
            this.#pages.set(normalizeRoute(route), page);
        }
    }
    /**
     * Theme controls: `app.theme.register(theme)` and `app.theme.use(id)`.
     *
     * A namespace rather than another `register*` method, because adding a theme does not
     * fill a slot or own a route — it appends to a collection that already has an owner.
     * `register()` works before or after `render()`; `use()` re-renders the current route
     * through the router so the URL and the stored choice stay truthful.
     */
    get theme() {
        const app = this;
        return {
            register(theme) {
                app.#registerTheme(theme);
                return app;
            },
            use(themeId) {
                if (themeId === app.#theme)
                    return;
                // The router owns the address bar and re-emits the route change, so a switch follows
                // exactly the path of a visitor who arrived with `?theme=`. Setting #theme here and
                // re-rendering on our own would leave the URL lying.
                if (app.#router) {
                    app.#router.navigate(app.#route || app.#defaultRoute, themeId, app.#fragment);
                    return;
                }
                app.#theme = themeId;
                app.#log("theme:changed", { themeId, via: "direct" });
            },
            get ids() {
                return app.#themes?.ids ?? [];
            },
            get current() {
                return app.#theme;
            },
        };
    }
    #registerTheme(theme) {
        if (!this.#themes) {
            // No theme port yet: queue it, and the port creation flushes the queue.
            this.#pendingThemes.push(theme);
            return;
        }
        if (typeof this.#themes.register !== "function") {
            throw new Error(`[AioApp] The registered theme module cannot accept "${theme?.themeId ?? "?"}" after render: ` +
                "its port has no register(). Pass the themes in registerModule(ThemeRenderer, { themes }).");
        }
        this.#themes.register(theme);
        this.#log("theme:registered", { themeId: theme.themeId });
    }
    /** Route currently rendered. Empty until `render()` finishes. */
    get currentRoute() {
        return this.#route;
    }
    /** Root element of the mounted page, `null` before `render()`. */
    get shell() {
        return this.#root;
    }
    /** Route list derived from content and controllers — what the router validates. */
    get routes() {
        return [...new Set([...this.#pages.keys(), ...this.#controllers.keys()])];
    }
    /** Registers per-route behaviour. Registering the same route twice replaces it. */
    registerPage(route, controller, config) {
        if (this.#rendered) {
            throw new Error("[AioApp] registerPage() must be called before render().");
        }
        const key = normalizeRoute(route);
        if (this.#controllers.has(key)) {
            console.warn(`[AioApp] Route "${key}" already has a controller; replacing it.`);
        }
        this.#controllers.set(key, { module: controller, config });
        return this;
    }
    registerModule(target, config) {
        if (this.#rendered) {
            throw new Error("[AioApp] registerModule() must be called before render().");
        }
        const isClass = typeof target === "function";
        const slot = (isClass
            ? target.slot
            : (config ?? target?.constructor?.slot));
        if (!slot) {
            throw new Error("[AioApp] Cannot tell which slot this module fills. Add " +
                '`static readonly slot = "<slot>"` to a class, or pass the slot as the ' +
                "second argument: registerModule(instance, \"router\").");
        }
        if (this.#registrations.has(slot)) {
            console.warn(`[AioApp] Slot "${slot}" already has a module; replacing it.`);
        }
        this.#registrations.set(slot, {
            module: isClass ? target : null,
            config: isClass ? config : undefined,
            instance: isClass ? null : target,
        });
        return this;
    }
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
    async render() {
        if (this.#rendered)
            return;
        this.#container = resolveContainer(this.#containerTarget);
        this.#createModules();
        this.#rendered = true;
        this.#log("render:init", { routes: this.routes, theme: this.#theme, slots: [...this.#registrations.keys()] });
        const initial = this.#router.parseUrlHash();
        await this.#renderRoute(initial.route, initial.fragment);
    }
    /** Navigates through the router so the URL stays the single source of truth. */
    navigate(route, fragment = "") {
        if (!this.#router)
            return;
        this.#router.navigate(route, this.#theme, fragment);
    }
    /**
     * Creates every registered module in two phases.
     *
     * Storage goes first: the persisted theme has to be known *before* the router is
     * built, because a router is constructed with its initial theme. Everything else
     * then follows registration order.
     */
    #createModules() {
        const context = {
            routes: this.routes,
            defaultRoute: this.#defaultRoute,
            theme: this.#initialTheme,
            debug: this.#debug,
            onRouteChanged: (state) => this.#onRouteChanged(state),
        };
        // Fail before creating anything: a missing slot is a configuration mistake, and
        // discovering it halfway leaves half a working app behind.
        const missing = REQUIRED_SLOTS.filter((slot) => !this.#registrations.has(slot));
        if (missing.length) {
            throw new Error(`[AioApp] Missing required module(s): ${missing.join(", ")}. ` +
                `Register them with registerModule(...) before render().`);
        }
        // Phase 1 — storage, so the theme can be restored before any consumer exists.
        const storage = this.#registrations.get("storage");
        if (storage) {
            this.#ports.set("storage", createPort("storage", storage, context));
            const persisted = this.#storage?.get(THEME_STORAGE_KEY);
            if (persisted) {
                this.#theme = persisted;
                context.theme = persisted;
            }
        }
        // Phase 2 — the rest, in registration order. A module that throws mid-way must
        // not leave the modules created before it running unattended.
        const created = storage ? ["storage"] : [];
        try {
            for (const [slot, registration] of this.#registrations) {
                if (slot === "storage")
                    continue;
                this.#ports.set(slot, createPort(slot, registration, context));
                created.push(slot);
            }
        }
        catch (error) {
            this.#releasePorts(created.reverse());
            throw error;
        }
        // Whatever `app.theme.register()` collected before mount is applied here, where the
        // port finally exists — same door, same behaviour, either timing.
        for (const theme of this.#pendingThemes)
            this.#registerTheme(theme);
        this.#pendingThemes = [];
        // Component events. The registry takes one publisher and injects it into every
        // builder config, so a component reports `elementAdded`/`elementChanged`/… without
        // knowing whether the application registered an emitter. The lookup is lazy, so the
        // events port may be created before or after the registry.
        this.#registry?.useEmitter?.((event, data) => this.#events?.emit(event, data));
        this.#log("modules:created", { slots: created });
    }
    /** Runs controller teardown, cancels in-flight work, releases modules, unmounts. */
    destroy() {
        this.#abort?.abort();
        this.#release();
        // Announce while the modules are still alive: a listener that wants to release its
        // own subscription does so on this event, so it must arrive before the ports go.
        this.#events?.emit("destroyed", { route: this.#route });
        // Reverse creation order: a module created last is released first.
        this.#releasePorts([...this.#ports.keys()].reverse());
        this.#root?.remove();
        this.#root = null;
        this.#container = null;
        this.#controllers.clear();
        this.#rendered = false;
        this.#route = "";
        this.#log("destroy", {});
    }
    /**
     * Releases ports in the given order and forgets them.
     *
     * A port owns its resources when it exposes `destroy()`; nothing else is assumed, so a
     * module that needs no teardown simply has no such method.
     */
    #releasePorts(slots) {
        for (const slot of slots) {
            const port = this.#ports.get(slot);
            this.#ports.delete(slot);
            if (!port || typeof port.destroy !== "function")
                continue;
            try {
                port.destroy();
            }
            catch (error) {
                console.error(`[AioApp] destroy of module "${slot}" failed:`, error);
            }
        }
    }
    // ------------------------------------------------
    // Route pipeline
    // ------------------------------------------------
    #onRouteChanged(state) {
        if (state.theme && state.theme !== this.#theme) {
            const previous = this.#theme;
            this.#theme = state.theme;
            this.#storage?.set(THEME_STORAGE_KEY, state.theme);
            try {
                this.#themes?.use?.(state.theme);
            }
            catch (error) {
                console.error("[AioApp] theme switch failed:", error);
            }
            this.#events?.emit("themeChanged", {
                theme: state.theme,
                previous,
                shell: this.#root,
            });
            this.#log("themeChanged", { theme: state.theme });
        }
        return this.#renderRoute(state.route, state.fragment);
    }
    /**
     * One complete render pass: instantiate controller, prepare, preload, render, swap.
     *
     * Every step after an `await` re-checks the sequence number, and the pass carries an
     * `AbortSignal` that fires as soon as a newer navigation starts — so a slow fetch can
     * never paint over the route the visitor already moved to.
     */
    async #renderRoute(route, fragment) {
        const sequence = ++this.#sequence;
        const target = this.#resolveRoute(route);
        this.#events?.emit("pageChanged", { route: target, previous: this.#route || null });
        this.#log("render:start", { route: target, sequence });
        this.#abort?.abort();
        const abort = (this.#abort = new AbortController());
        try {
            if (this.#route && this.#route !== target)
                this.#release();
            const { controller, context } = this.#createPage(target, fragment, abort.signal);
            // `onPrepare` failing is reported, not fatal: the route keeps whatever DOM it had.
            let prepared = undefined;
            if (controller?.onPrepare) {
                try {
                    prepared = await controller.onPrepare(context);
                }
                catch (error) {
                    if (!context.signal.aborted)
                        this.#fail(target, "prepare", "onPrepare failed", error);
                }
            }
            if (sequence !== this.#sequence)
                return this.#supersede(target, sequence);
            const page = prepared ?? context.page;
            if (!page) {
                throw new Error(`[AioApp] Route "${target}" has no page: declare it in source.pages or return one from onPrepare().`);
            }
            const themed = this.#themes?.prepare(page, target, this.#theme) ?? page;
            const pageNode = pageToNode(themed, target);
            const menuNode = this.#menu(controller);
            const footerNode = this.#source.footer ?? null;
            const nodes = [menuNode, pageNode, footerNode].filter(Boolean);
            const names = this.#registry.collect(nodes);
            const known = names.filter((name) => this.#registry.has(name));
            const missing = names.filter((name) => !this.#registry.has(name));
            this.#log("preload", { route: target, components: names, missing, sequence });
            this.#events?.emit("beforeRender", { route: target, components: names, missing, sequence });
            if (known.length)
                await this.#registry.load(known, nodes);
            if (sequence !== this.#sequence)
                return this.#supersede(target, sequence);
            const pageEl = this.#renderNode(pageNode);
            if (!pageEl)
                throw new Error(`[AioApp] Renderer returned no element for route "${target}"`);
            const menuEl = menuNode ? this.#renderNode(menuNode) : null;
            const footerEl = footerNode ? this.#renderNode(footerNode) : null;
            const tree = assembleShell(menuEl, pageEl, footerEl);
            // `#paint` consumes `#fragment`, so route state is settled before the swap.
            this.#route = target;
            this.#fragment = fragment || "";
            this.#paint(tree, themed);
            if (sequence !== this.#sequence)
                return this.#supersede(target, sequence);
            // `ready` carries the element map, so it is emitted after `#ready()` has built it
            // and activated the theme — "attached" means the page is usable, not merely painted.
            const blocks = this.#ready(target, themed, tree, controller, menuEl, footerEl);
            this.#events?.emit("ready", { route: target, shell: tree, elements: blocks, sequence });
            this.#log("render:done", { route: target, sequence });
        }
        catch (error) {
            if (abort.signal.aborted)
                return this.#supersede(target, sequence);
            // The previous DOM stays mounted on purpose: a broken route must not blank
            // the application.
            this.#fail(target, "render", "Render failed", error);
        }
    }
    /** Creates the controller for this pass and the context handed to it. */
    #createPage(route, fragment, signal) {
        const declared = this.#pages.get(route) ?? null;
        const context = {
            route,
            page: declared,
            fragment,
            theme: this.#theme,
            builders: declared ? this.#registry.collect(pageToNode(declared, route)) : [],
            http: this.#http,
            signal,
        };
        const entry = this.#controllers.get(route);
        if (!entry)
            return { controller: null, context };
        const controller = new entry.module(entry.config, context);
        this.#active = controller;
        return { controller, context };
    }
    /** Lets the controller rewrite the menu node. The app calls it, once per render. */
    #menu(controller) {
        const menu = this.#source.menu ?? null;
        if (!menu || !controller?.attachMenu || menu instanceof HTMLElement)
            return menu;
        try {
            return controller.attachMenu(menu);
        }
        catch (error) {
            console.error("[AioApp] attachMenu failed:", error);
            return menu;
        }
    }
    /**
     * Reports the mounted page to its controller and to the theme.
     *
     * @returns The `id → element` map of the painted shell — the same map the caller
     *   publishes with `ready`, so a listener sees what the controller saw.
     */
    #ready(route, page, shell, controller, menu, footer) {
        const blocks = new Map();
        for (const element of shell.querySelectorAll("[id]"))
            blocks.set(element.id, element);
        try {
            this.#themes?.activate(shell, blocks, route);
        }
        catch (error) {
            console.error(`[AioApp] theme activate failed for route "${route}":`, error);
        }
        if (!controller?.onReady)
            return blocks;
        const context = { route, page, shell, menu, footer, blocks };
        try {
            controller.onReady(context);
        }
        catch (error) {
            console.error(`[AioApp] onReady failed for route "${route}":`, error);
            this.#fail(route, "ready", "onReady failed", error);
        }
        return blocks;
    }
    /** Releases the controller of the route being left. */
    #release() {
        const controller = this.#active;
        this.#active = null;
        if (this.#root) {
            try {
                this.#themes?.deactivate?.(this.#root);
            }
            catch (error) {
                console.error("[AioApp] theme deactivate failed:", error);
            }
        }
        if (!controller?.onDestroy)
            return;
        try {
            controller.onDestroy();
        }
        catch (error) {
            console.error("[AioApp] onDestroy failed:", error);
        }
    }
    /** Builds the renderer callbacks once and reuses them for nested nodes. */
    #renderNode(node) {
        const renderer = this.#renderer;
        if (!renderer)
            throw new Error("[AioApp] No renderer module registered for slot \"renderer\".");
        const renderFn = (child) => renderer.render(child, renderFn, buildFn);
        const buildFn = (name, data) => {
            if (!this.#registry.has(name)) {
                this.#log("miss", { component: name });
                return null;
            }
            return this.#registry.build(name, data);
        };
        return renderer.render(node, renderFn, buildFn, { scopeId: this.#route });
    }
    /**
     * Builds the tree and paints it.
     *
     * These steps are never used apart — replace the children, set the title, release any
     * scroll lock a previous route left, animate, honour a deep link — so they live in one
     * place instead of a chain of one-call helpers.
     */
    #paint(tree, page) {
        const container = this.#container;
        if (!container)
            return;
        container.replaceChildren(tree);
        this.#root = tree;
        // A route that opened a modal or overlay must not leave the page frozen.
        document.body.style.overflow = "";
        const title = isPageDocument(page) ? page.title : undefined;
        if (title)
            document.title = title;
        this.#animation?.init(tree);
        const fragment = this.#fragment;
        this.#fragment = "";
        if (!fragment || typeof requestAnimationFrame !== "function")
            return;
        requestAnimationFrame(() => {
            document.getElementById(fragment)?.scrollIntoView({ block: "start", behavior: "auto" });
        });
    }
    /** Reports a failed pass. The previous DOM stays mounted on purpose. */
    #fail(route, phase, message, error) {
        console.error(`[AioApp] ${message} for route "${route}":`, error);
        this.#events?.emit("error", { message, route, phase, error });
    }
    /** Reports a pass a newer navigation replaced. Nothing is painted from it. */
    #supersede(route, sequence) {
        this.#log("render:superseded", { route, sequence });
        this.#events?.emit("superseded", { route, sequence, by: this.#sequence });
    }
    /** Falls back to the default route, then to the first known route, for an unknown hash. */
    #resolveRoute(route) {
        const known = (name) => this.#pages.has(name) || this.#controllers.has(name);
        const candidate = normalizeRoute(route, this.#defaultRoute);
        if (known(candidate))
            return candidate;
        if (known(this.#defaultRoute))
            return this.#defaultRoute;
        return this.routes[0] ?? this.#defaultRoute;
    }
    #log(event, payload) {
        if (!this.#debug)
            return;
        console.debug(`[AioApp] ${event}`, payload);
    }
}
//# sourceMappingURL=AioApp.js.map