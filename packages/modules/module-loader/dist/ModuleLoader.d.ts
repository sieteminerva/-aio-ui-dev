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
export declare class ModuleLoader<TContext = unknown, TResult = unknown> {
    #private;
    /**
     * @param scope - Namespace label, for example `"form"`.
     * @param definitions - Definitions to register up front. Empty by default, so a
     *   Lite consumer passes nothing and keeps the built-in behaviour.
     * @param options - Duplicate policy for module ids.
     * @throws {RegistryError} With code `INVALID_SCOPE` when the scope label is malformed.
     */
    constructor(scope: string, definitions?: iModuleDefinition<TContext, TResult>[], options?: iModuleLoaderOptions);
    /** The definition store backing this loader. */
    get registry(): ModuleRegistry<TContext, TResult>;
    /** Scope label shared with the backing registry. */
    get scope(): string;
    /**
     * Lists registered module ids in registration order.
     *
     * @returns A new array that is safe to mutate.
     */
    ids(): string[];
    /**
     * Checks whether a module definition is registered.
     *
     * @param id - Module identifier.
     * @returns `true` when registered.
     */
    has(id: string): boolean;
    /**
     * Resolves a registered definition without loading it.
     *
     * @param id - Module identifier.
     * @returns The definition, or `null` when the module is not registered.
     */
    resolve(id: string): iModuleDefinition<TContext, TResult> | null;
    /**
     * Lists ids of modules that currently hold a live instance.
     *
     * @returns A new array in load order.
     */
    loadedIds(): string[];
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
    loaded(id: string): TResult | null;
    /**
     * Checks whether a module currently holds a live instance.
     *
     * @param id - Module identifier.
     * @returns `true` when loaded.
     */
    isLoaded(id: string): boolean;
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
    load(id: string, context: TContext): TResult | null;
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
    resolveAll(context: TContext): TResult[];
    /**
     * Destroys and forgets one loaded module.
     *
     * @param id - Module identifier.
     * @returns `true` when a live instance was released, `false` when it was not loaded.
     */
    unload(id: string): boolean;
    /**
     * Destroys and forgets every loaded module, newest first.
     *
     * @summary Reverse order matches dependency direction: dependants unload before
     * the modules they require.
     * @returns Nothing.
     */
    unloadAll(): void;
}
//# sourceMappingURL=ModuleLoader.d.ts.map