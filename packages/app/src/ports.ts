/**
 * Ports the application shell needs from its collaborators.
 *
 * The shell owns orchestration only: routing, preload, render, mount and teardown.
 * Every collaborator is injected, so the shell can be pointed at a different
 * renderer, router or animation implementation without knowing how they work.
 *
 * These interfaces are also the requirement list handed to Phase 2
 * (`ComponentRegistry` rewrite): whatever is declared here is what the registry
 * must be able to do.
 */

import type { iBuilderRegistry } from "@aio-ui/core/registry";
import type { iNodeContent } from "@aio-ui/core/node";

/** Minimal route state the shell consumes. Mirrors `iRouteState` in `@aio-ui/router`. */
export interface iShellRouteState {
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

  /** Resolves builder modules and stylesheets ahead of a render pass. */
  preload(names: string[], pagesData: unknown[]): Promise<void>;

  /** Builds one component element synchronously from already-preloaded assets. */
  build(name: keyof iBuilderRegistry, data: any): HTMLElement;
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
  parseUrlHash(): iShellRouteState;
  updateValidRoutes(validRoutes: string[]): void;
  destroy(): void;
}

/**
 * Router construction is injected too, because the shell has to hand the router
 * its own route-changed callback.
 */
export type iRouterFactory = (
  defaultRoute: string,
  initialTheme: string,
  validRoutes: string[],
  onRouteChanged: (state: iShellRouteState) => void | Promise<void>
) => iRouterPort;

/** What the shell needs from the animation service. */
export interface iAnimationPort {
  init(root?: ParentNode): unknown;
  destroy?(): void;
}

/** What the shell needs from an event emitter. */
export interface iEventPort {
  emit(event: string, data: unknown): void;
  on(event: string, callback: (data: any) => void): void;
}

/** Every collaborator the shell accepts. Only `registry` and `routerFactory` are required. */
export interface iAppShellDeps {
  registry: iComponentRegistryPort;
  routerFactory: iRouterFactory;
  renderer?: iRendererPort;
  animation?: iAnimationPort;
  events?: iEventPort;
}
