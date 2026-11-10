import { RegistryError } from "@aio-ui/core";
import type { RegistryDuplicatePolicy } from "@aio-ui/core";
import { ModuleRegistry } from "./ModuleRegistry";
import type { iModuleDefinition } from "./ModuleRegistry";

/** Construction options for `ModuleLoader`. */
export interface iModuleLoaderOptions {
  /** Duplicate policy applied when two definitions share an id. Defaults to `"warn"`. */
  duplicate?: RegistryDuplicatePolicy;
}

/**
 * 🚚 MODULE LOADER — lifecycle for optional modules.
 *
 * Loads, tracks, and destroys module instances on top of a `ModuleRegistry`.
 * Dependency ordering, rebuild-safe reload, and reverse-order teardown live here
 * so the registry can stay a plain definition store.
 *
 * @example
 * const loader = new ModuleLoader<iFormModuleContext, any>("form", FULL_FORM_MODULES);
 * const feature = loader.load("validation", { form, builder: "form", ... });
 * loader.unloadAll();
 */
export class ModuleLoader<TContext = unknown, TResult = unknown> {
  /** Definition storage created and owned by this loader. */
  readonly #registry: ModuleRegistry<TContext, TResult>;

  /** Loaded instances in load order, so teardown can run in reverse. */
  #instances = new Map<string, TResult>();

  /**
   * @param scope - Namespace label, for example `"form"`.
   * @param definitions - Definitions to register up front. Empty by default, so a
   *   Lite consumer passes nothing and keeps the built-in behaviour.
   * @param options - Duplicate policy for module ids.
   * @throws {RegistryError} With code `INVALID_SCOPE` when the scope label is malformed.
   */
  constructor(
    scope: string,
    definitions: iModuleDefinition<TContext, TResult>[] = [],
    options: iModuleLoaderOptions = {},
  ) {
    this.#registry = new ModuleRegistry<TContext, TResult>(scope, { duplicate: options.duplicate });

    // Step 1: Register the preset's definitions, if any.
    for (const definition of definitions) {
      this.#registry.register(definition);
    }
  }

  /** The definition store backing this loader. */
  public get registry(): ModuleRegistry<TContext, TResult> {
    return this.#registry;
  }

  /** Scope label shared with the backing registry. */
  public get scope(): string {
    return this.#registry.scope;
  }

  /**
   * Lists registered module ids in registration order.
   *
   * @returns A new array that is safe to mutate.
   */
  public ids(): string[] {
    return this.#registry.ids();
  }

  /**
   * Checks whether a module definition is registered.
   *
   * @param id - Module identifier.
   * @returns `true` when registered.
   */
  public has(id: string): boolean {
    return this.#registry.has(id);
  }

  /**
   * Resolves a registered definition without loading it.
   *
   * @param id - Module identifier.
   * @returns The definition, or `null` when the module is not registered.
   */
  public resolve(id: string): iModuleDefinition<TContext, TResult> | null {
    return this.#registry.resolve(id);
  }

  /**
   * Lists ids of modules that currently hold a live instance.
   *
   * @returns A new array in load order.
   */
  public loadedIds(): string[] {
    return Array.from(this.#instances.keys());
  }

  /**
   * Returns the instance already held by a module, without loading it.
   *
   * @summary Use this after `resolveAll()` when a caller needs a typed handle on a
   * module the loader already settled, such as an engine it will call directly.
   * @param id - Module identifier.
   * @returns The live instance, or `null` when the module is not loaded.
   * @example
   * loader.resolveAll(context);
   * const feature = loader.loaded("validation");
   */
  public loaded(id: string): TResult | null {
    if (!this.#instances.has(id)) return null;
    return this.#instances.get(id) as TResult;
  }

  /**
   * Checks whether a module currently holds a live instance.
   *
   * @param id - Module identifier.
   * @returns `true` when loaded.
   */
  public isLoaded(id: string): boolean {
    return this.#instances.has(id);
  }

  /**
   * Loads a module by id.
   *
   * @summary Resolves required dependencies first, destroys any previous instance
   * of the same module (rebuild semantics), then delegates to `definition.load()`.
   * @param id - Module identifier.
   * @param context - Host context forwarded to `definition.load()`.
   * @returns The live module object, or `null` when the module is not registered.
   * @throws {RegistryError} With code `MISSING_DEPENDENCY` when a required module is not registered, or `CYCLIC_DEPENDENCY` when `requires` forms a loop.
   * @example
   * const feature = loader.load("validation", context);
   */
  public load(id: string, context: TContext): TResult | null {
    return this.#load(id, context, new Set<string>());
  }

  /**
   * Loads every module whose `matches()` accepts the context.
   *
   * @summary Idempotent: modules that already hold an instance are skipped, so a
   * caller can run `resolveAll()` once per lifecycle phase and only the modules
   * that become applicable in that phase are loaded. Modules without `matches`
   * always apply. Iteration follows registration order.
   * @param context - Host context forwarded to `matches()` and `load()`.
   * @returns Only the instances loaded by this call, in registration order.
   * @throws {RegistryError} Same failure modes as {@link load}.
   */
  public resolveAll(context: TContext): TResult[] {
    const loaded: TResult[] = [];

    // Step 1: Walk definitions in registration order and skip settled modules.
    for (const id of this.#registry.ids()) {
      if (this.#instances.has(id)) continue;

      const instance = this.load(id, context);
      if (instance !== null) loaded.push(instance);
    }

    return loaded;
  }

  /**
   * Destroys and forgets one loaded module.
   *
   * @param id - Module identifier.
   * @returns `true` when a live instance was released, `false` when it was not loaded.
   */
  public unload(id: string): boolean {
    return this.#release(id);
  }

  /**
   * Destroys and forgets every loaded module, newest first.
   *
   * @summary Reverse order matches dependency direction: dependants unload before
   * the modules they require.
   * @returns Nothing.
   */
  public unloadAll(): void {
    // Step 1: Snapshot then reverse so teardown mirrors load order.
    for (const id of Array.from(this.#instances.keys()).reverse()) {
      this.#release(id);
    }
  }

  /**
   * Loads a module and its dependency chain.
   *
   * @param id - Module identifier.
   * @param context - Host context forwarded to `definition.load()`.
   * @param visiting - Ids currently on the dependency stack, used for cycle detection.
   * @returns The live module object, or `null` when unregistered.
   */
  #load(id: string, context: TContext, visiting: Set<string>): TResult | null {
    const definition = this.#registry.resolve(id);
    if (!definition) return null;

    // Step 1: Honour the definition's own applicability predicate.
    if (typeof definition.matches === "function" && !definition.matches(context)) return null;

    // Step 2: Refuse dependency cycles before touching instances.
    if (visiting.has(id)) {
      throw new RegistryError(
        "CYCLIC_DEPENDENCY",
        `Module "${id}" in scope "${this.scope}" takes part in a dependency cycle.`,
        { scope: this.scope, id },
      );
    }
    visiting.add(id);

    // Step 3: Load declared dependencies first.
    for (const dependencyId of definition.requires ?? []) {
      if (!this.#registry.has(dependencyId)) {
        throw new RegistryError(
          "MISSING_DEPENDENCY",
          `Module "${id}" requires "${dependencyId}", which is not registered in scope "${this.scope}".`,
          { scope: this.scope, id: dependencyId },
        );
      }
      this.#load(dependencyId, context, visiting);
    }

    visiting.delete(id);

    // Step 4: Release any previous instance so rebuilds never leak handlers.
    this.#release(id);

    // Step 5: Load and track the new instance.
    const instance = definition.load(context);
    this.#instances.set(id, instance);
    return instance;
  }

  /**
   * Destroys and forgets a loaded instance.
   *
   * @param id - Module identifier.
   * @returns `true` when something was released.
   */
  #release(id: string): boolean {
    if (!this.#instances.has(id)) return false;

    // Step 1: Read the instance before deleting so the module can own teardown.
    const instance = this.#instances.get(id) as TResult;
    this.#instances.delete(id);

    // Step 2: Delegate teardown to the definition that produced the instance.
    this.#registry.resolve(id)?.destroy?.(instance);
    return true;
  }
}
