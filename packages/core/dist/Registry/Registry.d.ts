import type { iRegistryEntry, iRegistryLike, iRegistryOptions } from "./RegistryTypes";
/**
 * 🧱 REGISTRY KERNEL — generic storage and resolution primitive.
 *
 * The kernel owns exactly one concern: mapping string ids to values inside an
 * isolated instance, with explicit duplicate handling and disposal. It knows
 * nothing about components, DOM, stylesheets, modules, pages, or lazy loading.
 * Those are adapter responsibilities (`ComponentRegistry`, future
 * `ModuleRegistry`, `PageRegistry`, `TemplateRegistry`).
 *
 * @example
 * const registry = new Registry<Definition>("module", { duplicate: "warn" });
 * registry.register("cascade", cascadeDefinition);
 * const definition = registry.resolve("cascade");
 */
export declare class Registry<TValue> implements iRegistryLike<TValue> {
    #private;
    /**
     * @param scope - Namespace label, for example `"component"` or `"form"`.
     * @param options - Duplicate policy and optional disposal hook.
     * @throws {RegistryError} With code `INVALID_SCOPE` when the scope label is malformed.
     */
    constructor(scope: string, options?: iRegistryOptions<TValue>);
    /** Scope label that isolates this instance from other registry instances. */
    get scope(): string;
    /** Number of stored entries. */
    get size(): number;
    /**
     * Registers a value under an id.
     *
     * @summary Validates the id, applies the duplicate policy from the constructor
     * options, then stores the value.
     * @param id - Identifier unique inside this instance.
     * @param value - Value to store. The kernel never interprets it.
     * @returns The current instance, for fluent registration chains.
     * @throws {RegistryError} With code `INVALID_ID` for a malformed id, or `DUPLICATE_ID` when the policy is `"error"` and the id exists.
     * @example
     * registry.register("masonry", masonryDefinition);
     */
    register(id: string, value: TValue): this;
    /**
     * Resolves a value by id.
     *
     * @summary Read-only lookup. Missing ids and non-string inputs resolve to
     * `null` instead of throwing, so optional resolution stays branch-free at
     * call sites such as `resolve(id) ?? fallback`.
     * @param id - Identifier to look up.
     * @returns The stored value, or `null` when absent.
     * @example
     * const definition = registry.resolve("cascade");
     */
    resolve(id: string): TValue | null;
    /**
     * Resolves a value by id and fails when it is missing.
     *
     * @summary Use this when a missing registration is a programming error rather
     * than an expected optional path.
     * @param id - Identifier to look up.
     * @returns The stored value.
     * @throws {RegistryError} With code `MISSING_ENTRY` when nothing is registered under `id`.
     * @example
     * const definition = registry.require("cascade");
     */
    require(id: string): TValue;
    /**
     * Checks whether an id is registered.
     *
     * @param id - Identifier to test.
     * @returns `true` when an entry exists.
     * @example
     * registry.has("cascade"); // true
     */
    has(id: string): boolean;
    /**
     * Removes an entry and disposes it.
     *
     * @summary Deletes the entry first, then calls the disposal hook, so a hook
     * that inspects the registry never observes the detached value.
     * @param id - Identifier to remove.
     * @returns `true` when an entry was removed, `false` when it was absent.
     * @example
     * registry.unregister("cascade");
     */
    unregister(id: string): boolean;
    /**
     * Removes every entry and disposes each one.
     *
     * @summary Clears storage before invoking the disposal hook for every removed
     * pair, so re-entrant lookups during disposal see an empty registry.
     * @returns Nothing.
     * @example
     * registry.clear();
     */
    clear(): void;
    /**
     * Lists stored pairs in registration order.
     *
     * @returns A new array that is safe to mutate.
     * @example
     * registry.entries(); // [{ id: "cascade", value: definition }]
     */
    entries(): iRegistryEntry<TValue>[];
    /**
     * Lists registered ids in registration order.
     *
     * @returns A new array that is safe to mutate.
     * @example
     * registry.ids(); // ["masonry", "article"]
     */
    ids(): string[];
}
//# sourceMappingURL=Registry.d.ts.map