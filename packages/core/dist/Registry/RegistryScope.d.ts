/** Scope label used when a caller does not care about isolation. */
export declare const DEFAULT_REGISTRY_SCOPE = "app";
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
export declare function assertValidScope(scope: string): string;
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
export declare function assertValidId(id: string, scope: string): string;
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
export declare function qualifyId(scope: string, id: string): string;
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
export declare function splitQualifiedId(qualifiedId: string): {
    scope: string;
    id: string;
} | null;
//# sourceMappingURL=RegistryScope.d.ts.map