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
import type {
  iAnimationPort,
  iAppRouteState,
  iComponentRegistryPort,
  iEventPort,
  iHttpPort,
  iRendererPort,
  iRouterPort,
  iStoragePort,
} from "./ports";

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

/** Construction options that are not content. */
export interface iAppOptions {
  /** Mount point, resolved once at `mount()`. */
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

// ====================================================
// Modules — everything the app consumes is registered
// ====================================================

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
  /** Builds the port. Called once, during `mount()`, with the registered config. */
  new(...args: any[]): iAppSlots[K];
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

/** A page controller class; the route is given at registration, not by the class. */
export interface iPageControllerClass<C = unknown> {
  new(config: C, context: iPageContext): iPageController;
}

/** Public surface of a mounted app. */
export interface iApp {
  /** Route currently rendered. */
  readonly currentRoute: string;
  /** Root element of the mounted page, `null` before `mount()`. */
  readonly shell: HTMLElement | null;

  /**
   * Registers the module that fills a slot. Must be called before `mount()`.
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

  /** Resolves the container, creates the registered modules and renders the current route. */
  mount(): Promise<void>;

  /** Navigates to a route through the router. */
  navigate(route: string): void;

  /** Registers a controller for a route. */
  registerPage<M extends iPageControllerClass>(
    route: string,
    controller: M,
    config?: ConstructorParameters<M>[0]
  ): iApp;

  /** Releases modules in reverse registration order and unmounts the page. */
  destroy(): void;
}
