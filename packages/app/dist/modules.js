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
/**
 * The `storage` port.
 *
 * The driver is wrapped instead of used directly: `localStorage` throws in private
 * mode and inside a sandboxed iframe, and a saved theme is never worth a broken page.
 * Without a driver the port stays usable and simply forgets between reloads.
 */
export class AppStorage {
    /** Slot this class fills when registered as an app module. */
    static slot = "storage";
    #driver;
    #memory = new Map();
    constructor(config = {}) {
        this.#driver = config.driver;
    }
    get(key) {
        if (!this.#driver)
            return this.#memory.get(key) ?? null;
        try {
            return this.#driver.getItem(key);
        }
        catch {
            return null;
        }
    }
    set(key, value) {
        if (!this.#driver) {
            this.#memory.set(key, value);
            return;
        }
        try {
            this.#driver.setItem(key, value);
        }
        catch {
            /* persistence is optional */
        }
    }
}
//# sourceMappingURL=modules.js.map