import { Registry } from "@aio-ui/core";
/**
 * 🧩 MODULE REGISTRY — storage for module definitions.
 *
 * Owns one concern: which definitions exist, keyed by id. It never loads,
 * instantiates, or destroys anything; that is `ModuleLoader`'s job. Keeping the
 * two apart means a definition store can be shared or inspected without creating
 * live objects.
 *
 * @example
 * const modules = new ModuleRegistry<iFormModuleContext>("form");
 * modules.register(validationFormAdapter);
 * modules.has("validation"); // true
 */
export class ModuleRegistry {
    /** Definition storage delegated to the registry kernel. */
    #definitions;
    /**
     * @param scope - Namespace label, for example `"form"` or `"animation"`.
     * @param options - Duplicate policy for module ids.
     * @throws {RegistryError} With code `INVALID_SCOPE` when the scope label is malformed.
     */
    constructor(scope, options = {}) {
        this.#definitions = new Registry(scope, {
            duplicate: options.duplicate ?? "warn",
        });
    }
    /** Scope label that isolates this registry from other module registries. */
    get scope() {
        return this.#definitions.scope;
    }
    /** Number of registered definitions. */
    get size() {
        return this.#definitions.size;
    }
    /**
     * Registers a module definition.
     *
     * @param definition - Definition to register; its `id` becomes the lookup key.
     * @returns The current registry instance, for fluent registration chains.
     * @throws {RegistryError} With code `INVALID_ID` for a malformed id, or `DUPLICATE_ID` when the policy is `"error"` and the id exists.
     * @example
     * modules.register(validationFormAdapter);
     */
    register(definition) {
        // Step 1: Delegate storage to the kernel using the definition id.
        this.#definitions.register(definition.id, definition);
        return this;
    }
    /**
     * Resolves a registered definition.
     *
     * @param id - Module identifier.
     * @returns The definition, or `null` when the module is not registered.
     * @example
     * modules.resolve("validation")?.requires;
     */
    resolve(id) {
        return this.#definitions.resolve(id);
    }
    /**
     * Checks whether a module definition is registered.
     *
     * @param id - Module identifier.
     * @returns `true` when registered.
     */
    has(id) {
        return this.#definitions.has(id);
    }
    /**
     * Lists registered module ids in registration order.
     *
     * @returns A new array that is safe to mutate.
     */
    ids() {
        return this.#definitions.ids();
    }
}
//# sourceMappingURL=ModuleRegistry.js.map