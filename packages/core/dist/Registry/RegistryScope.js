import { RegistryError } from "./RegistryError.js";
/** Scope label used when a caller does not care about isolation. */
export const DEFAULT_REGISTRY_SCOPE = "app";
/** Scope labels must start with an alphanumeric character and contain no spaces. */
const SCOPE_PATTERN = /^[a-z0-9][a-z0-9._-]*$/i;
/**
 * Validates and normalises a registry scope label.
 *
 * @summary Trims the label and rejects values that cannot be used as a stable
 * namespace key, so two registries cannot silently share a scope by accident.
 * @param scope - Candidate scope label, for example `"component"` or `"form"`.
 * @returns The trimmed scope label.
 * @throws {RegistryError} With code `INVALID_SCOPE` when the label is empty, padded-recoverable but malformed, or contains whitespace.
 * @example
 * assertValidScope("form"); // "form"
 * assertValidScope("  ");   // throws RegistryError
 */
export function assertValidScope(scope) {
    const trimmed = typeof scope === "string" ? scope.trim() : "";
    // Step 1: Reject empty or malformed labels before they become map keys.
    if (!trimmed || !SCOPE_PATTERN.test(trimmed)) {
        throw new RegistryError("INVALID_SCOPE", `Invalid registry scope "${String(scope)}". Use a non-empty label without whitespace.`, { scope: trimmed || String(scope) });
    }
    return trimmed;
}
/**
 * Validates a registry entry id.
 *
 * @summary Rejects empty and whitespace-only ids so `register()` cannot create
 * entries that later lookups can never address.
 * @param id - Candidate identifier.
 * @param scope - Scope used for error reporting.
 * @returns The identifier unchanged.
 * @throws {RegistryError} With code `INVALID_ID` when the id is not a non-empty string.
 * @example
 * assertValidId("cascade", "form"); // "cascade"
 */
export function assertValidId(id, scope) {
    // Step 1: Require a non-empty string id.
    if (typeof id !== "string" || !id.trim()) {
        throw new RegistryError("INVALID_ID", `Invalid registry id "${String(id)}" in scope "${scope}". Ids must be non-empty strings.`, { scope, id: String(id) });
    }
    return id;
}
/**
 * Builds a fully qualified key from a scope and an id.
 *
 * @summary Useful for adapters that flatten several instances into one shared
 * store while keeping their scopes readable in logs and debugging tools.
 * @param scope - Registry scope label.
 * @param id - Entry identifier.
 * @returns A `scope:id` string.
 * @example
 * qualifyId("form", "cascade"); // "form:cascade"
 */
export function qualifyId(scope, id) {
    return `${assertValidScope(scope)}:${assertValidId(id, scope)}`;
}
/**
 * Splits a previously qualified `scope:id` key.
 *
 * @summary Inverse of {@link qualifyId}; splits on the first colon so ids may
 * themselves contain colons.
 * @param qualifiedId - Value produced by {@link qualifyId}.
 * @returns The parsed parts, or `null` when the input has no `scope:id` shape.
 * @example
 * splitQualifiedId("form:cascade"); // { scope: "form", id: "cascade" }
 */
export function splitQualifiedId(qualifiedId) {
    // Step 1: Guard against non-strings and missing separators.
    if (typeof qualifiedId !== "string")
        return null;
    const separator = qualifiedId.indexOf(":");
    if (separator <= 0 || separator === qualifiedId.length - 1)
        return null;
    // Step 2: Keep everything after the first colon as the id.
    return {
        scope: qualifiedId.slice(0, separator),
        id: qualifiedId.slice(separator + 1),
    };
}
//# sourceMappingURL=RegistryScope.js.map