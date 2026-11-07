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
import type { iBuilderRegistry } from "@aio-ui/core/registry";

import type {
  iAnimationPort,
  iComponentRegistryPort,
  iEventPort,
  iRendererPort,
  iRouterPort,
  iStoragePort,
} from "./ports";
import type {
  iApp,
  iAppConfig,
  iAppModuleClass,
  iAppModuleContext,
  iAppSlots,
  iAppSlot,
  iPageBlock,
  iPageContent,
  iPageController,
  iPageDocument,
  iPagePrepareContext,
} from "./types";

/** Storage key of the persisted theme id. Kept identical to the legacy key. */
const THEME_STORAGE_KEY = "active_theme";

/** Class added to the wrapper the shell creates when it owns menu/footer slots. */
const SHELL_CLASS = "aio-shell";

/** Placeholder entry-file fallback. */
const DEFAULT_ROUTE = "home";

/** Slots that must be registered before `mount()` can run. */
const REQUIRED_SLOTS = ["registry", "router", "renderer"] as const;

// ====================================================
// 1. PURE HELPERS (exported so callers and tests can use them)
// ====================================================

/** Canonical route key: trimmed, no leading `#`, no trailing slash, lower case. */
export function normalizeRoute(route: unknown, fallback: string = DEFAULT_ROUTE): string {
  const value =
    typeof route === "string"
      ? route.trim().replace(/^#+/, "").replace(/\/+$/, "")
      : "";
  return (value || fallback).toLowerCase();
}

/** A page document is recognised by its `blocks` list; anything else is a node tree. */
export function isPageDocument(value: unknown): value is iPageDocument {
  return !!value && typeof value === "object" && Array.isArray((value as iPageDocument).blocks);
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
export function blockToNode(block: iPageBlock): iBasicNode {
  const node: Record<string, unknown> = { builder: block.type, isRoot: true };

  if (block.id) node.id = block.id;
  if (block.className) node.className = block.className;
  if (block.attrs) node.attrs = block.attrs;

  const children =
    Array.isArray(block.children) && block.children.length
      ? block.children.map(blockToNode)
      : undefined;
  const payload = children ?? block.props;
  if (payload !== undefined) node.content = payload;

  return node as unknown as iBasicNode;
}

/** Normalises any page content into a node tree the renderer understands. */
export function pageToNode(page: iPageContent, route: string = ""): iNodeContent {
  if (!isPageDocument(page)) return page;

  const id = page.route || route;
  const node: Record<string, unknown> = {
    tagName: "main",
    className: id ? `page route-${id}` : "page",
    content: (page.blocks ?? []).map(blockToNode),
  };
  if (page.theme) node.attrs = { "data-theme": page.theme };

  return node as unknown as iNodeContent;
}

/** Resolves a container from a selector or an element, failing fast. */
function resolveContainer(target: HTMLElement | string): HTMLElement {
  const element =
    typeof target === "string" ? document.querySelector(target) : target;
  if (!(element instanceof HTMLElement)) {
    throw new Error(`[AioApp] Container not found: ${String(target)}`);
  }
  return element;
}

// ====================================================
// 2. THE SHELL
// ====================================================

export class AioApp implements iApp {
  readonly #source: iAppConfig["source"];
  readonly #containerTarget: HTMLElement | string;
  readonly #defaultRoute: string;
  readonly #initialTheme: string;
  readonly #debug: boolean;

  /** Route content keyed by normalised route name; built once at construction. */
  readonly #pages = new Map<string, iPageContent>();

  /** Registered modules, keyed by slot. Insertion order is creation order. */
  #registrations = new Map<
    iAppSlot,
    { module: iAppModuleClass | null; config: unknown; instance: unknown }
  >();

  #controllers = new Map<string, iPageController>();
  #registry: iComponentRegistryPort | null = null;
  #router: iRouterPort | null = null;
  #renderer: iRendererPort | null = null;
  #animation: iAnimationPort | null = null;
  #events: iEventPort | null = null;
  #storage: iStoragePort | null = null;
  #container: HTMLElement | null = null;
  #root: HTMLElement | null = null;

  #route = "";
  #theme: string;
  #fragment = "";
  #sequence = 0;
  #mounted = false;

  constructor(config: iAppConfig) {
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

  /** Route currently rendered. Empty until `mount()` finishes. */
  public get currentRoute(): string {
    return this.#route;
  }

  /** Root element of the mounted page, `null` before `mount()`. */
  public get shell(): HTMLElement | null {
    return this.#root;
  }

  /** Route list derived from the source — this is what the router validates against. */
  public get routes(): string[] {
    return [...this.#pages.keys()];
  }

  /** Registers per-route behaviour. Registering the same route twice replaces it. */
  public registerController(controller: iPageController): void {
    this.#controllers.set(normalizeRoute(controller.route), controller);
  }

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
   * Nothing is instantiated here: a class is constructed during `mount()`, because a
   * module may need the route list, the restored theme or the change callback, which
   * do not exist yet. Registering the same slot twice replaces the earlier module and
   * says so, because that is almost always a mistake in a generated project.
   *
   * @param module - Module class, or an already-built port instance/object.
   * @param config - Class: the constructor config. Instance: the slot to fill, when
   *   the object has no `constructor.slot` (plain literal, factory result, proxy).
   * @returns The app, for a fluent chain.
   * @throws {Error} When called after `mount()`, or when no slot can be determined.
   */
  public registerModule<M extends iAppModuleClass>(
    module: M,
    config?: ConstructorParameters<M>[0]
  ): iApp;
  public registerModule(instance: iAppSlots[iAppSlot], slot?: iAppSlot): iApp;
  public registerModule(target: unknown, config?: unknown): iApp {
    if (this.#mounted) {
      throw new Error("[AioApp] registerModule() must be called before mount().");
    }

    const isClass = typeof target === "function";
    const slot = (isClass
      ? (target as iAppModuleClass).slot
      : ((config as iAppSlot | undefined) ?? (target as any)?.constructor?.slot)) as iAppSlot | undefined;

    if (!slot) {
      throw new Error(
        "[AioApp] Cannot tell which slot this module fills. Add " +
        '`static readonly slot = "<slot>"` to a class, or pass the slot as the ' +
        "second argument: registerModule(instance, \"router\")."
      );
    }

    if (this.#registrations.has(slot)) {
      console.warn(`[AioApp] Slot "${slot}" already has a module; replacing it.`);
    }

    this.#registrations.set(slot, {
      module: isClass ? (target as iAppModuleClass) : null,
      config: isClass ? config : undefined,
      instance: isClass ? null : target,
    });
    return this;
  }

  /**
   * Resolves the container, creates the registered modules and renders the route
   * the URL already points at.
   *
   * Modules are created here, not at registration, because a module may need data
   * that only exists at mount time (the route list, the restored theme, the
   * route-changed callback).
   */
  public async mount(): Promise<void> {
    if (this.#mounted) return;

    this.#container = resolveContainer(this.#containerTarget);
    this.#createModules();

    this.#mounted = true;
    this.#log("mount", { routes: this.routes, theme: this.#theme, slots: [...this.#registrations.keys()] });

    const initial = this.#router!.parseUrlHash();
    await this.#renderRoute(initial.route, initial.fragment);
  }

  /** Navigates through the router so the URL stays the single source of truth. */
  public navigate(route: string, fragment: string = ""): void {
    if (!this.#router) return;
    this.#router.navigate(route, this.#theme, fragment);
  }

  /**
   * Creates every registered module in two phases.
   *
   * Storage goes first: the persisted theme has to be known *before* the router is
   * built, because a router is constructed with its initial theme. Everything else
   * then follows registration order.
   */
  #createModules(): void {
    const context: iAppModuleContext = {
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
      throw new Error(
        `[AioApp] Missing required module(s): ${missing.join(", ")}. ` +
        `Register them with registerModule(...) before mount().`
      );
    }

    // Phase 1 — storage, so the theme can be restored before any consumer exists.
    const storage = this.#registrations.get("storage");
    if (storage) {
      this.#storage = this.#instantiate("storage", storage, context) as iStoragePort;
      const persisted = this.#storage.get(THEME_STORAGE_KEY);
      if (persisted) {
        this.#theme = persisted;
        context.theme = persisted;
      }
    }

    // Phase 2 — the rest, in registration order. A module that throws mid-way must
    // not leave the modules created before it running unattended.
    const created: iAppSlot[] = storage ? ["storage"] : [];
    try {
      for (const [slot, registration] of this.#registrations) {
        if (slot === "storage") continue;
        const port = this.#instantiate(slot, registration, context);
        created.push(slot);
        if (slot === "registry") this.#registry = port as iComponentRegistryPort;
        else if (slot === "router") this.#router = port as iRouterPort;
        else if (slot === "renderer") this.#renderer = port as iRendererPort;
        else if (slot === "animation") this.#animation = port as iAnimationPort;
        else if (slot === "events") this.#events = port as iEventPort;
      }
    } catch (error) {
      this.#releasePorts(created.reverse());
      throw error;
    }

    this.#log("modules:created", { slots: created });
  }

  /**
   * Returns the port of one registration.
   *
   * An instance registration is used as-is; a class registration is constructed with
   * `(config, context)` — the single constructor rule of the module convention.
   */
  #instantiate(
    slot: iAppSlot,
    registration: { module: iAppModuleClass | null; config: unknown; instance: unknown },
    context: iAppModuleContext
  ): unknown {
    if (!registration.module) return registration.instance;

    try {
      return new registration.module(registration.config, context);
    } catch (error) {
      throw new Error(`[AioApp] Failed to create module for slot "${slot}": ${(error as Error).message}`);
    }
  }

  /** Runs the active controller's teardown, releases modules and unmounts the page. */
  public destroy(): void {
    const active = this.#controllers.get(this.#route);
    this.#runHook(active, "onDestroy");

    // Reverse registration order: a module created last is released first.
    this.#releasePorts([...this.#registrations.keys()].reverse());

    this.#registry = null;
    this.#router = null;
    this.#renderer = null;
    this.#animation = null;
    this.#events = null;
    this.#storage = null;

    this.#root?.remove();
    this.#root = null;
    this.#container = null;
    this.#controllers.clear();
    this.#mounted = false;
    this.#route = "";

    this.#log("destroy", {});
  }

  /** Returns the port currently created for a slot, for module teardown. */
  #portOf(slot: iAppSlot): unknown {
    switch (slot) {
      case "registry": return this.#registry;
      case "router": return this.#router;
      case "renderer": return this.#renderer;
      case "animation": return this.#animation;
      case "events": return this.#events;
      case "storage": return this.#storage;
      default: return null;
    }
  }

  /**
   * Releases ports in the given order.
   *
   * A port owns its resources when it exposes `destroy()`; nothing else is assumed,
   * so a module that needs no teardown simply has no such method.
   */
  #releasePorts(slots: iAppSlot[]): void {
    for (const slot of slots) {
      const port = this.#portOf(slot) as { destroy?: () => void } | null;
      if (!port || typeof port.destroy !== "function") continue;
      try {
        port.destroy();
      } catch (error) {
        console.error(`[AioApp] destroy of module "${slot}" failed:`, error);
      }
    }
  }

  // ------------------------------------------------
  // Route pipeline
  // ------------------------------------------------

  #onRouteChanged(state: { route: string; theme: string | null; fragment: string }): Promise<void> {
    if (state.theme && state.theme !== this.#theme) {
      this.#theme = state.theme;
      this.#storage?.set(THEME_STORAGE_KEY, state.theme);
      this.#events?.emit("themeChanged", {
        theme: state.theme,
        shell: this.#root,
      });
      this.#log("themeChanged", { theme: state.theme });
    }
    return this.#renderRoute(state.route, state.fragment);
  }

  /**
   * One complete render pass: prepare, preload, render, swap, decorate.
   *
   * Every step after an `await` re-checks the sequence number, so a slower pass
   * can never overwrite a newer one.
   */
  async #renderRoute(route: string, fragment: string): Promise<void> {
    const sequence = ++this.#sequence;
    const target = this.#resolveRoute(route);
    const page = this.#pages.get(target);

    this.#events?.emit("pageChanged", { route: target });
    this.#log("render:start", { route: target, sequence });

    try {
      if (!page) throw new Error(`[AioApp] No page registered for route "${target}"`);

      if (this.#route && this.#route !== target) {
        this.#runHook(this.#controllers.get(this.#route), "onDestroy");
      }

      const prepared = await this.#prepare(target, page);
      if (sequence !== this.#sequence) return this.#log("render:superseded", { route: target, sequence });

      const node = this.#compose(pageToNode(prepared, target), target);
      const names = this.#registry!.collect(node);
      const known = names.filter((name) => this.#registry!.has(name));
      const missing = names.filter((name) => !this.#registry!.has(name));

      this.#log("preload", { route: target, components: names, missing, sequence });
      this.#events?.emit("beforeRender", { route: target, components: names, missing });
      if (known.length) await this.#registry!.load(known, [node]);
      if (sequence !== this.#sequence) return this.#log("render:superseded", { route: target, sequence });

      const tree = this.#renderNode(node);
      if (!tree) throw new Error(`[AioApp] Renderer returned no element for route "${target}"`);

      this.#commit(tree, prepared);
      this.#route = target;
      this.#fragment = fragment || "";
      await this.#afterCommit(target, tree);
      if (sequence !== this.#sequence) return;

      this.#events?.emit("ready", { route: target, shell: tree });
      this.#log("render:done", { route: target, sequence });
    } catch (error) {
      // The previous DOM stays mounted on purpose: a broken route must not blank
      // the application.
      console.error(`[AioApp] Render failed for route "${target}":`, error);
      this.#events?.emit("error", {
        message: "Render failed",
        route: target,
        error,
      });
    }
  }

  /** Runs the controller's `onPrepare` and returns the page tree to render. */
  async #prepare(route: string, page: iPageContent): Promise<iPageContent> {
    const controller = this.#controllers.get(route);
    if (!controller?.onPrepare) return page;

    const context: iPagePrepareContext = {
      route,
      page,
      menu: this.#source.menu ?? null,
      footer: this.#source.footer ?? null,
      theme: this.#theme,
      // Derived from the authored tree, before any module is loaded, so a
      // controller can inspect what the route is about to need.
      builders: this.#registry!.collect(pageToNode(page, route)),
    };

    try {
      const prepared = await controller.onPrepare(context);
      return prepared || page;
    } catch (error) {
      console.error(`[AioApp] onPrepare failed for route "${route}":`, error);
      this.#events?.emit("error", { message: "onPrepare failed", route, error });
      return page;
    }
  }

  /**
   * Wraps the page with the optional menu/footer slots.
   *
   * A LITE content tree usually already contains its own nav and footer, so the
   * shell only builds a wrapper when the source actually declares a slot. This
   * keeps the hand-written DOM byte-identical and gives a generated project the
   * place it needs.
   */
  #compose(pageNode: iNodeContent, route: string): iNodeContent {
    const controller = this.#controllers.get(route);
    const menu = this.#source.menu ?? null;
    const footer = this.#source.footer ?? null;
    if (!menu && !footer) return pageNode;

    const children: unknown[] = [];
    if (menu) children.push(this.#menuNode(menu, controller));
    children.push(pageNode);
    if (footer) children.push(footer);

    return { tagName: "div", className: SHELL_CLASS, content: children } as unknown as iNodeContent;
  }

  /** Lets a controller rewrite the menu node before it is rendered. */
  #menuNode(menu: iBasicNode | HTMLElement, controller?: iPageController): iBasicNode | HTMLElement {
    if (!controller?.attachMenu || !(menu instanceof Object) || menu instanceof HTMLElement) return menu;
    try {
      return controller.attachMenu(menu as iBasicNode);
    } catch (error) {
      console.error("[AioApp] attachMenu failed:", error);
      return menu;
    }
  }

  /** Builds the renderer callbacks once and reuses them for nested nodes. */
  #renderNode(node: iNodeContent): HTMLElement | null {
    const renderer = this.#renderer;
    if (!renderer) throw new Error("[AioApp] No renderer module registered for slot \"renderer\".");
    const renderFn = (child: any) => renderer.render(child, renderFn, buildFn);
    const buildFn = (name: keyof iBuilderRegistry, data: any) => {
      if (!this.#registry!.has(name)) {
        this.#log("miss", { component: name });
        return null;
      }
      return this.#registry!.build(name, data);
    };

    return renderer.render(node, renderFn, buildFn, { scopeId: this.#route });
  }

  /** Replaces the mounted page, keeping the container as the stable mount point. */
  #commit(tree: HTMLElement, page: iPageContent): void {
    const container = this.#container;
    if (!container) return;
    container.replaceChildren(tree);
    this.#root = tree;

    // The container scroll lock is a shell concern: a route that opened a modal
    // or an overlay must not leave the page frozen.
    document.body.style.overflow = "";

    const title = isPageDocument(page) ? page.title : undefined;
    if (title) document.title = title;
  }

  /** Post-commit work that needs the DOM to be live: animation, anchor, onReady. */
  async #afterCommit(route: string, tree: HTMLElement): Promise<void> {
    this.#animation?.init(tree);

    const controller = this.#controllers.get(route);
    if (controller?.onReady) {
      try {
        controller.onReady(new Map(), tree);
      } catch (error) {
        console.error(`[AioApp] onReady failed for route "${route}":`, error);
        this.#events?.emit("error", { message: "onReady failed", route, error });
      }
    }

    this.#scrollToFragment();
  }

  /** A deep link like `#blog/post-2` scrolls to the fragment after the render. */
  #scrollToFragment(): void {
    const fragment = this.#fragment;
    this.#fragment = "";
    if (!fragment || typeof requestAnimationFrame !== "function") return;

    requestAnimationFrame(() => {
      const target = document.getElementById(fragment);
      target?.scrollIntoView({ block: "start", behavior: "auto" });
    });
  }

  /** Falls back to the default route, then to the first page, for an unknown hash. */
  #resolveRoute(route: string): string {
    const candidate = normalizeRoute(route, this.#defaultRoute);
    if (this.#pages.has(candidate)) return candidate;
    if (this.#pages.has(this.#defaultRoute)) return this.#defaultRoute;
    return this.routes[0] ?? this.#defaultRoute;
  }

  #runHook(controller: iPageController | undefined, hook: "onDestroy"): void {
    if (!controller?.[hook]) return;
    try {
      controller[hook]!();
    } catch (error) {
      console.error(`[AioApp] ${hook} failed for route "${controller.route}":`, error);
    }
  }

  #log(event: string, payload: unknown): void {
    if (!this.#debug) return;
    console.debug(`[AioApp] ${event}`, payload);
  }
}
