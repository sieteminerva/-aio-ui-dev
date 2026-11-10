/**
 * 🧱 Registry barrel — the only public entry point for the registry kernel.
 *
 * Adapters should import from this barrel rather than reaching into individual
 * files, so the internal file layout can change without touching call sites.
 */
export { Registry } from "./Registry";
export { RegistryError } from "./RegistryError";
export type { RegistryErrorCode, iRegistryErrorDetails } from "./RegistryError";
export { DEFAULT_REGISTRY_SCOPE, assertValidId, assertValidScope, qualifyId, splitQualifiedId, } from "./RegistryScope";
export type { RegistryDuplicatePolicy, iRegistryEntry, iRegistryLike, iRegistryOptions, } from "./RegistryTypes";
//# sourceMappingURL=index.d.ts.map