/**
 * Built-in app modules.
 *
 * A module is a **class**, and the class is the token: it declares the slot it
 * fills as a static member, and receives `(config, context)` in its constructor.
 * There is no wrapper class to write, no `defineModule()` alias and no factory
 * object — the repo's own classes already follow the convention:
 *
 * ```ts
 * app
 *   .registerModule(components)                        // instance you assembled
 *   .registerModule(HashRouter)                        // class, no config
 *   .registerModule(AppStorage, { driver: localStorage })
 *   .registerModule(AnimationsService)
 *   .registerModule(EventEmitter);
 * ```
 *
 * | Slot | Class | Package |
 * | --- | --- | --- |
 * | `registry` | `ComponentRegistry` | `@aio-ui/core` |
 * | `router` | `HashRouter` | `@aio-ui/router` |
 * | `renderer` | `DOMRenderer` (default) | `@aio-ui/core` |
 * | `animation` | `AnimationsService` | `@aio-ui/animations` |
 * | `events` | `EventEmitter` | `@aio-ui/event-emitter` |
 * | `storage` | `AppStorage` | this package |
 *
 * `registry` and `router` are required; the rest have safe fallbacks.
 */
import type { iStoragePort } from "./ports";
/** Anything with the two methods of the Web Storage API. */
export interface iStorageDriver {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
}
/** Config of `AppStorage`, passed as the second argument of `registerModule`. */
export interface iStorageConfig {
    /** `localStorage`, `sessionStorage`, or a test double. Omit for no persistence. */
    driver?: iStorageDriver;
}
/**
 * The `storage` port.
 *
 * The driver is wrapped instead of used directly: `localStorage` throws in private
 * mode and inside a sandboxed iframe, and a saved theme is never worth a broken page.
 * Without a driver the port stays usable and simply forgets between reloads.
 */
export declare class AppStorage implements iStoragePort {
    #private;
    /** Slot this class fills when registered as an app module. */
    static readonly slot: "storage";
    constructor(config?: iStorageConfig);
    get(key: string): string | null;
    set(key: string, value: string): void;
}
//# sourceMappingURL=modules.d.ts.map