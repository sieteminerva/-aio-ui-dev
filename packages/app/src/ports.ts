/**
 * Ports the application shell needs from its adapters.
 *
 * The shell owns orchestration only: routing, preload, render, mount and teardown.
 * Every adapter is injected, so the shell can be pointed at a different
 * renderer, router or animation implementation without knowing how they work.
 *
 * These interfaces are also the requirement list handed to Phase 2
 * (`ComponentRegistry` rewrite): whatever is declared here is what the registry
 * must be able to do.
 */

import type { iBuilderRegistry } from "@aio-ui/core/registry";
import type { iEventCallback, iEventEmit } from "@aio-ui/core/events";
import type { iNodeContent } from "@aio-ui/core/node";

/** Minimal route state the shell consumes. Mirrors `iRouteState` in `@aio-ui/router`. */
export interface iAppRouteState {
  route: string;
  theme: string | null;
  fragment: string;
}

/**
 * What the shell needs from the component registry.
 *
 * `preload` must be awaited before rendering: `build` is synchronous, so a
 * component whose module has not been loaded yet cannot be built.
 */
export interface iComponentRegistryPort {
  /** Whether a builder name is registered. */
  has(name: string): boolean;

  /** Registered builder names, in registration order. */
  getRegisteredNames(): string[];

  /**
   * Derives the component names a source needs, without loading anything.
   *
   * Lives on the port (not in the app) so the app never imports the collector:
   * `@aio-ui/app` stays a type-only dependency on `@aio-ui/core`.
   */
  collect(source: unknown): string[];

  /** Resolves builder modules and stylesheets ahead of a render pass. */
  load(names: string[], pagesData?: unknown[]): Promise<void>;

  /** Builds one component element synchronously from already-preloaded assets. */
  build(name: keyof iBuilderRegistry, data: any): HTMLElement;

  /**
   * Hands the registry the publisher every builder config will carry.
   *
   * Optional: a custom registry may not support component events at all, and the shell
   * must keep working with it. When implemented, the shell calls it once, right after
   * the modules are created — from then on every `registry.build()` injects `emit` into
   * the component config, so a component reports its own events without knowing whether
   * an event bus exists.
   */
  useEmitter?(emit: iEventEmit): void;
}

/** What the shell needs from the declarative renderer. */
export interface iRendererPort {
  render(
    content: iNodeContent,
    renderFn?: (node: any) => HTMLElement | null,
    builderFn?: (name: keyof iBuilderRegistry, data: any) => HTMLElement | null,
    options?: { scopeId?: string; parentKey?: string | null }
  ): HTMLElement;
}

/** What the shell needs from a router instance. */
export interface iRouterPort {
  navigate(routeId: string, themeId?: string | null, fragmentId?: string): void;
  parseUrlHash(): iAppRouteState;
  updateValidRoutes(validRoutes: string[]): void;
  destroy(): void;
}

/**
 * Router construction is still a factory, but it is now handed to a router module
 * (`RouterModule`) instead of being handed to the app directly: the app supplies the
 * routes and the change callback, the module supplies the class.
 */
export type iRouterFactory = (
  defaultRoute: string,
  initialTheme: string,
  validRoutes: string[],
  onRouteChanged: (state: iAppRouteState) => void | Promise<void>
) => iRouterPort;

/** What the shell needs from the animation service. */
export interface iAnimationPort {
  init(root?: ParentNode): unknown;
  destroy?(): void;
}

/**
 * What the app needs from an event emitter.
 *
 * Typed against `iPageEvents`, which already extends the component map — so the same port
 * carries `elementAdded`/`elementChanged`/`elementRemoved` forwarded from the registry.
 * A real `EventEmitter` satisfies this as-is; the payload of an unknown key is untyped,
 * which is what lets a component name its own events.
 */
export interface iEventPort {
  /** Publishes an event. Known keys carry their payload type, custom ones are untyped. */
  emit: iEventEmit;

  /** Subscribes to an event. */
  on<K extends string>(event: K, callback: iEventCallback<K>): void;
}

/**
 * What the app hands to a page controller for data access.
 *
 * Every byte a page loads goes through here — including mock JSON, which is fetched
 * as a real request so switching to a live backend is a configuration change, not a
 * code rewrite.
 */
export interface iHttpPort {
  /** Reads records. `query` names the table (or whatever the backend expects). */
  get(query: Record<string, any>): Promise<any>;
  /** Writes records. */
  post(query: Record<string, any>, payload: unknown): Promise<any>;
}

/**
 * What the app needs from persistent storage.
 *
 * Only the theme id is persisted today. The port exists so the app never touches
 * `localStorage` directly: a generated project may run in a privacy mode, in an
 * iframe, or in a Node test, where `localStorage` is either absent or throws.
 */
export interface iStoragePort {
  get(key: string): string | null;
  set(key: string, value: string): void;
}
