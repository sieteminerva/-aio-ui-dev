/**
 * 📚 REGISTRY TYPES — shared contracts for the reusable registry kernel.
 *
 * These types describe storage mechanics only. Domain behaviour (lazy module
 * loading, stylesheet injection, page factories, module lifecycle) stays in the
 * typed adapters that build on top of `Registry`.
 */
/**
 * Policy applied when `Registry.register()` receives an id that already exists.
 *
 * - `error` — throw {@link RegistryError} with code `DUPLICATE_ID`.
 * - `warn` — log a warning, then replace the existing value.
 * - `replace` — replace silently. Use this to preserve legacy overwrite behaviour.
 * - `ignore` — keep the existing value and drop the incoming one.
 */
export type RegistryDuplicatePolicy = "error" | "warn" | "replace" | "ignore";
/**
 * Construction options for the registry kernel.
 *
 * @summary Configures duplicate handling and an optional disposal hook shared by
 * every removal path (`unregister`, `clear`).
 */
export interface iRegistryOptions<TValue = unknown> {
    /** Duplicate handling policy. Defaults to `"error"`. */
    duplicate?: RegistryDuplicatePolicy;
    /**
     * Called after a value is detached from the storage map by `unregister()` or
     * `clear()`. Not called when a duplicate is replaced, because replacement is
     * treated as re-registration (HMR, preset rebuild) rather than disposal.
     */
    onDispose?: (value: TValue, id: string) => void;
}
/** A single stored pair, as returned by `Registry.entries()`. */
export interface iRegistryEntry<TValue> {
    /** Stable identifier the value was registered under, within the registry scope. */
    id: string;
    /** Stored value. The kernel never interprets it. */
    value: TValue;
}
/**
 * Read/write surface shared by the kernel and its typed adapters.
 *
 * @summary Adapters implement this shape so call sites can depend on the
 * registry contract instead of the concrete kernel class.
 */
export interface iRegistryLike<TValue> {
    /** Scope label that isolates this instance from other registry instances. */
    readonly scope: string;
    /** Number of stored entries. */
    readonly size: number;
    /**
     * Stores a value under an id.
     *
     * @param id - Identifier, unique inside this registry instance.
     * @param value - Value to store. The kernel does not interpret it.
     * @returns The current instance, for fluent registration chains.
     * @throws {RegistryError} When the id is invalid, or when the duplicate policy is `"error"` and the id already exists.
     */
    register(id: string, value: TValue): this;
    /**
     * Looks up a value.
     *
     * @param id - Identifier to look up.
     * @returns The stored value, or `null` when absent or when the id is not a non-empty string.
     */
    resolve(id: string): TValue | null;
    /**
     * Looks up a value and fails when it is missing.
     *
     * @param id - Identifier to look up.
     * @returns The stored value.
     * @throws {RegistryError} With code `MISSING_ENTRY` when nothing is registered under `id`.
     */
    require(id: string): TValue;
    /**
     * Checks whether an id is registered.
     *
     * @param id - Identifier to test.
     * @returns `true` when an entry exists.
     */
    has(id: string): boolean;
    /**
     * Removes an entry and disposes it.
     *
     * @param id - Identifier to remove.
     * @returns `true` when an entry was removed, `false` when it was absent.
     */
    unregister(id: string): boolean;
    /**
     * Removes every entry and disposes each one.
     *
     * @returns Nothing.
     */
    clear(): void;
    /**
     * Lists stored pairs in registration order.
     *
     * @returns A new array that is safe to mutate.
     */
    entries(): iRegistryEntry<TValue>[];
    /**
     * Lists registered ids in registration order.
     *
     * @returns A new array that is safe to mutate.
     */
    ids(): string[];
}
//# sourceMappingURL=RegistryTypes.d.ts.map