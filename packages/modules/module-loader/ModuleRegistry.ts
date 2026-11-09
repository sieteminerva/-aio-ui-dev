import { Registry } from "@aio-ui/core";
import type { RegistryDuplicatePolicy } from "@aio-ui/core";

/**
 * A loadable module definition.
 *
 * @summary Definitions are data, not behaviour: `load()` receives a host context
 * and returns the live object the caller keeps, and `destroy()` receives that same
 * object so teardown stays with the module that produced it.
 *
 * Naming follows the repository convention: `create` is reserved for declarations
 * that produce DOM (`Base.create`), and `activate` is reserved for page/shell
 * controllers (`iHorizontalPage.activate`). A module *loads* itself.
 */
export interface iModuleDefinition<TContext = unknown, TResult = unknown> {
  /** Stable module identifier inside the registry scope. */
  id: string;

  /** Ids that must be loaded before this module. Checked by `ModuleLoader`. */
  requires?: string[];

  /**
   * Optional predicate used by `ModuleLoader.resolveAll()` to decide whether this
   * module applies to the supplied context.
   */
  matches?: (context: TContext) => boolean;

  /**
   * Loads the module and returns the live object owned by the caller.
   *
   * @param context - Host context supplied by the consumer (form, page, app).
   * @returns The live module object.
   */
  load: (context: TContext) => TResult;

  /**
   * Releases the object previously returned by `load()`.
   *
   * @param instance - The exact object returned by `load()` for this module.
   */
  destroy?: (instance: TResult) => void;
}

/** Construction options for `ModuleRegistry`. */
export interface iModuleRegistryOptions {
  /** Duplicate policy for module ids. Defaults to `"warn"`. */
  duplicate?: RegistryDuplicatePolicy;
}

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
export class ModuleRegistry<TContext = unknown, TResult = unknown> {
  /** Definition storage delegated to the registry kernel. */
  readonly #definitions: Registry<iModuleDefinition<TContext, TResult>>;

  /**
   * @param scope - Namespace label, for example `"form"` or `"animation"`.
   * @param options - Duplicate policy for module ids.
   * @throws {RegistryError} With code `INVALID_SCOPE` when the scope label is malformed.
   */
  constructor(scope: string, options: iModuleRegistryOptions = {}) {
    this.#definitions = new Registry<iModuleDefinition<TContext, TResult>>(scope, {
      duplicate: options.duplicate ?? "warn",
    });
  }

  /** Scope label that isolates this registry from other module registries. */
  public get scope(): string {
    return this.#definitions.scope;
  }

  /** Number of registered definitions. */
  public get size(): number {
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
  public register(definition: iModuleDefinition<TContext, TResult>): this {
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
  public resolve(id: string): iModuleDefinition<TContext, TResult> | null {
    return this.#definitions.resolve(id);
  }

  /**
   * Checks whether a module definition is registered.
   *
   * @param id - Module identifier.
   * @returns `true` when registered.
   */
  public has(id: string): boolean {
    return this.#definitions.has(id);
  }

  /**
   * Lists registered module ids in registration order.
   *
   * @returns A new array that is safe to mutate.
   */
  public ids(): string[] {
    return this.#definitions.ids();
  }
}
