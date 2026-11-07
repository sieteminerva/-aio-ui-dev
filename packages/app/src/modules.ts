/**
 * Built-in app modules.
 *
 * Every collaborator the app consumes is a module class. A module class has two
 * static members, and that is the whole convention:
 *
 * - `slot` — which port it fills (`iAppSlots` key),
 * - `create(config, context)` — builds the port at `mount()`.
 *
 * Because the *class* is the token, registration stays a single readable line and
 * the config lives next to it, not inside `iAppConfig`:
 *
 * ```ts
 * const app = new AioApp({ container: "#app", source: { pages } })
 *   .registerModule(ComponentsModule, { registry: components })
 *   .registerModule(RouterModule, { Router: HashRouter })
 *   .registerModule(StorageModule, { driver: localStorage })
 *   .registerModule(AnimationsModule, { Service: AnimationsService })
 *   .registerModule(EventsModule, { emitter });
 * ```
 *
 * Only `registry` and `router` are required; the rest have safe fallbacks.
 */

import { DOMRenderer } from "@aio-ui/core/DOMRenderer";

import type {
  iAnimationPort,
  iComponentRegistryPort,
  iEventPort,
  iRendererPort,
  iRouterPort,
  iStoragePort,
} from "./ports";
import type { iAppModuleContext } from "./types";

// ====================================================
// registry — required
// ====================================================

/** Config of `ComponentsModule`. */
export interface iComponentsModuleConfig {
  /** Already-populated `ComponentRegistry` instance. */
  registry: iComponentRegistryPort;
}

/** Fills the `registry` slot. The components themselves are registered by the project. */
export class ComponentsModule {
  static readonly slot = "registry" as const;

  static create(config: iComponentsModuleConfig): iComponentRegistryPort {
    return config.registry;
  }
}

// ====================================================
// router — required
// ====================================================

/** Router constructor the app is allowed to call. */
export type iRouterClass = new (
  defaultRoute: string,
  initialTheme: string,
  validRoutes: string[],
  onRouteChanged: (state: { route: string; theme: string | null; fragment: string }) => void | Promise<void>
) => iRouterPort;

/** Config of `RouterModule`. */
export interface iRouterModuleConfig {
  /** Router class, for example `HashRouter`. */
  Router: iRouterClass;
}

/**
 * Fills the `router` slot.
 *
 * The class is passed in — the app never imports a router package — but the three
 * arguments a router cannot know by itself (`routes`, the restored `theme`, and the
 * change callback) come from the app through `context`.
 */
export class RouterModule {
  static readonly slot = "router" as const;

  static create(config: iRouterModuleConfig, context: iAppModuleContext): iRouterPort {
    return new config.Router(
      context.defaultRoute,
      context.theme,
      context.routes,
      context.onRouteChanged
    );
  }

  static destroy(router: iRouterPort): void {
    router.destroy();
  }
}

// ====================================================
// storage — optional, enables theme persistence
// ====================================================

/** Anything with the two methods of the Web Storage API. */
export interface iStorageDriver {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** Config of `StorageModule`. */
export interface iStorageModuleConfig {
  /** `localStorage`, `sessionStorage`, or a test double. Omit for no persistence. */
  driver?: iStorageDriver;
}

/** In-memory fallback, so `storage` is always a usable port. */
function memoryStorage(): iStoragePort {
  const values = new Map<string, string>();
  return {
    get: (key) => values.get(key) ?? null,
    set: (key, value) => void values.set(key, value),
  };
}

/**
 * Fills the `storage` slot.
 *
 * The driver is wrapped instead of used directly: `localStorage` throws in private
 * mode and inside a sandboxed iframe, and a preference is never worth a broken page.
 */
export class StorageModule {
  static readonly slot = "storage" as const;

  static create(config: iStorageModuleConfig = {}): iStoragePort {
    const driver = config.driver;
    if (!driver) return memoryStorage();

    return {
      get: (key) => {
        try {
          return driver.getItem(key);
        } catch {
          return null;
        }
      },
      set: (key, value) => {
        try {
          driver.setItem(key, value);
        } catch {
          /* persistence is optional */
        }
      },
    };
  }
}

// ====================================================
// animation — optional
// ====================================================

/** Config of `AnimationsModule`. */
export interface iAnimationsModuleConfig {
  /** Animation service class, for example `AnimationsService`. */
  Service: new () => iAnimationPort;
}

/** Fills the `animation` slot; `init(root)` runs after each page is attached. */
export class AnimationsModule {
  static readonly slot = "animation" as const;

  static create(config: iAnimationsModuleConfig): iAnimationPort {
    return new config.Service();
  }

  static destroy(animation: iAnimationPort): void {
    animation.destroy?.();
  }
}

// ====================================================
// events — optional
// ====================================================

/** Config of `EventsModule`. */
export interface iEventsModuleConfig {
  /** Emitter instance; only `emit` and `on` are used. */
  emitter: iEventPort;
}

/** Fills the `events` slot. Without it the app simply emits nothing. */
export class EventsModule {
  static readonly slot = "events" as const;

  static create(config: iEventsModuleConfig): iEventPort {
    return config.emitter;
  }
}

// ====================================================
// renderer — optional, defaults to DOMRenderer
// ====================================================

/** Config of `RendererModule`. */
export interface iRendererModuleConfig {
  /** Renderer class; defaults to `DOMRenderer`. */
  Renderer?: new () => iRendererPort;
}

/** Fills the `renderer` slot. Registered only when a project replaces the renderer. */
export class RendererModule {
  static readonly slot = "renderer" as const;

  static create(config: iRendererModuleConfig = {}): iRendererPort {
    const Renderer = config.Renderer ?? (DOMRenderer as unknown as new () => iRendererPort);
    return new Renderer();
  }
}
