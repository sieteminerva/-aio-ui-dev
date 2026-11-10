/**
 * 🧱 Registry barrel — the only public entry point for the registry kernel.
 *
 * Adapters should import from this barrel rather than reaching into individual
 * files, so the internal file layout can change without touching call sites.
 */
export { Registry } from "./Registry.js";
export { RegistryError } from "./RegistryError.js";
export { DEFAULT_REGISTRY_SCOPE, assertValidId, assertValidScope, qualifyId, splitQualifiedId, } from "./RegistryScope.js";
//# sourceMappingURL=index.js.map