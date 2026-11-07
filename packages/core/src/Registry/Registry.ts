import { RegistryError } from "./RegistryError";
import { assertValidId, assertValidScope } from "./RegistryScope";
import type {
  iRegistryEntry,
  iRegistryLike,
  iRegistryOptions,
  RegistryDuplicatePolicy,
} from "./RegistryTypes";

/** Duplicate policy used when the caller does not provide one. */
const DEFAULT_DUPLICATE_POLICY: RegistryDuplicatePolicy = "error";

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
export class Registry<TValue> implements iRegistryLike<TValue> {
  /** Scope label that isolates this instance from other registry instances. */
  readonly #scope: string;

  /** Duplicate handling policy applied by `register()`. */
  readonly #duplicate: RegistryDuplicatePolicy;

  /** Optional disposal hook invoked by `unregister()` and `clear()`. */
  readonly #onDispose?: (value: TValue, id: string) => void;

  /** Insertion-ordered storage; `Map` preserves registration order. */
  #values = new Map<string, TValue>();

  /**
   * @param scope - Namespace label, for example `"component"` or `"form"`.
   * @param options - Duplicate policy and optional disposal hook.
   * @throws {RegistryError} With code `INVALID_SCOPE` when the scope label is malformed.
   */
  constructor(scope: string, options: iRegistryOptions<TValue> = {}) {
    this.#scope = assertValidScope(scope);
    this.#duplicate = options.duplicate ?? DEFAULT_DUPLICATE_POLICY;
    this.#onDispose = options.onDispose;
  }

  /** Scope label that isolates this instance from other registry instances. */
  public get scope(): string {
    return this.#scope;
  }

  /** Number of stored entries. */
  public get size(): number {
    return this.#values.size;
  }

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
  public register(id: string, value: TValue): this {
    // Step 1: Reject ids that could never be resolved later.
    const key = assertValidId(id, this.#scope);

    // Step 2: Apply the configured duplicate policy.
    if (this.#values.has(key)) {
      switch (this.#duplicate) {
        case "error":
          throw new RegistryError(
            "DUPLICATE_ID",
            `Registry "${this.#scope}" already contains an entry for "${key}".`,
            { scope: this.#scope, id: key },
          );
        case "ignore":
          return this;
        case "warn":
          console.warn(`[Registry:${this.#scope}] Replacing duplicate entry "${key}".`);
          break;
        case "replace":
        default:
          break;
      }
    }

    // Step 3: Store the value and keep the chain fluent.
    this.#values.set(key, value);
    return this;
  }

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
  public resolve(id: string): TValue | null {
    if (typeof id !== "string") return null;
    return this.#values.get(id) ?? null;
  }

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
  public require(id: string): TValue {
    // Step 1: Reuse `resolve()` so both paths share the same lookup semantics.
    const value = this.resolve(id);
    if (value === null) {
      throw new RegistryError(
        "MISSING_ENTRY",
        `Registry "${this.#scope}" has no entry for "${String(id)}".`,
        { scope: this.#scope, id: String(id) },
      );
    }
    return value;
  }

  /**
   * Checks whether an id is registered.
   *
   * @param id - Identifier to test.
   * @returns `true` when an entry exists.
   * @example
   * registry.has("cascade"); // true
   */
  public has(id: string): boolean {
    return typeof id === "string" && this.#values.has(id);
  }

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
  public unregister(id: string): boolean {
    if (typeof id !== "string" || !this.#values.has(id)) return false;

    // Step 1: Read the value before deleting so the hook can receive it.
    const value = this.#values.get(id) as TValue;

    // Step 2: Detach the entry, then run disposal.
    this.#values.delete(id);
    this.#onDispose?.(value, id);
    return true;
  }

  /**
   * Removes every entry and disposes each one.
   *
   * @summary Clears storage before invoking the disposal hook for every removed
   * pair, so re-entrant lookups during disposal see an empty registry.
   * @returns Nothing.
   * @example
   * registry.clear();
   */
  public clear(): void {
    // Step 1: Snapshot the pairs, then empty storage.
    const detached = Array.from(this.#values.entries());
    this.#values.clear();

    // Step 2: Dispose each removed pair.
    for (const [id, value] of detached) {
      this.#onDispose?.(value, id);
    }
  }

  /**
   * Lists stored pairs in registration order.
   *
   * @returns A new array that is safe to mutate.
   * @example
   * registry.entries(); // [{ id: "cascade", value: definition }]
   */
  public entries(): iRegistryEntry<TValue>[] {
    // Step 1: Materialise the map into plain objects.
    return Array.from(this.#values, ([id, value]) => ({ id, value }));
  }

  /**
   * Lists registered ids in registration order.
   *
   * @returns A new array that is safe to mutate.
   * @example
   * registry.ids(); // ["masonry", "article"]
   */
  public ids(): string[] {
    return Array.from(this.#values.keys());
  }
}
