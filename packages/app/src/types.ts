/**
 * Application shell contracts.
 *
 * A shell turns a source description (pages, menu, footer) into a live routed
 * application: it derives which components a page needs, preloads them, renders
 * the page, swaps the root element, and runs page lifecycle hooks.
 *
 * The shape is deliberately narrow. Whatever the shell must know is declared
 * here; anything else belongs to a package it receives through `iAppShellDeps`.
 */

import type { iBasicNode, iNodeContent } from "@aio-ui/core/node";
import type { iAppShellDeps } from "./ports";

/**
 * Source of truth for the application content.
 *
 * In the LITE edition this is written by hand (`src/content/*`). In a generated
 * project it is produced by transforming the CMS response into node trees.
 */
export interface iAppShellSource {
  /** Route name to page tree. */
  pages: Record<string, iNodeContent>;
  menu?: iBasicNode | HTMLElement | null;
  footer?: iBasicNode | HTMLElement | null;
}

/** Construction options that are not content. */
export interface iAppShellOptions {
  /** Mount point, resolved once at construction. */
  container: HTMLElement | string;
  /** Route used when the hash is empty or invalid. Defaults to `home`. */
  defaultRoute?: string;
  /** Initial theme id. Defaults to `default`. */
  theme?: string;
  /** Enables the shell debug channel (resolved builders, preload graph, misses). */
  debug?: boolean;
}

/** Full configuration: content, options and injected collaborators. */
export interface iAppShellConfig extends iAppShellOptions {
  source: iAppShellSource;
  deps: iAppShellDeps;
}

/** Context passed to a page controller before its route is rendered. */
export interface iPagePrepareContext {
  route: string;
  page: iNodeContent;
  menu: iBasicNode | HTMLElement | null;
  footer: iBasicNode | HTMLElement | null;
  theme: string | null;
  /** Builder names derived from the page tree, before any module is loaded. */
  builders: string[];
}

/**
 * Optional per-route behaviour.
 *
 * A controller never renders anything itself: it may adjust the page tree before
 * the render pass, and observes the result afterwards.
 */
export interface iPageController {
  /** Route this controller belongs to. */
  readonly route: string;

  /** Runs once per route render, before preload and render. May return a page tree to use instead. */
  onPrepare?(context: iPagePrepareContext): iNodeContent | void | Promise<iNodeContent | void>;

  /** Runs after the new page tree is attached to the DOM. */
  onReady?(elements: Map<string, HTMLElement>, shell: HTMLElement): void;

  /** Runs before the route's DOM is replaced or the shell is destroyed. */
  onDestroy?(): void;

  /** May rewrite the menu node before it is rendered. */
  attachMenu?(menu: iBasicNode): iBasicNode;
}

/** Public surface of a mounted shell. */
export interface iAppShell {
  /** Route currently rendered. */
  readonly currentRoute: string;
  /** Root element of the mounted shell, `null` before `mount()`. */
  readonly shell: HTMLElement | null;

  /** Resolves the container, wires the router and renders the current hash route. */
  mount(): Promise<void>;

  /** Navigates to a route through the router. */
  navigate(route: string): void;

  /** Registers a controller for its `route`. */
  registerController(controller: iPageController): void;

  /** Detaches listeners, runs controller teardown and removes the shell root. */
  destroy(): void;
}
