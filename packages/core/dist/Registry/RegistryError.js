/**
 * Typed error used by every registry kernel failure path.
 *
 * @summary Carries a stable `code`, the registry `scope`, and the offending `id`
 * so callers can branch on the failure kind without parsing messages.
 *
 * @example
 * try {
 *   registry.register("cascade", definition);
 * } catch (error) {
 *   if (error instanceof RegistryError && error.code === "DUPLICATE_ID") {
 *     // handle the duplicate registration
 *   }
 * }
 */
export class RegistryError extends Error {
    /** Stable failure reason. */
    code;
    /** Registry scope that raised the error. */
    scope;
    /** Offending id, when the failure is id-specific. */
    id;
    /**
     * @param code - Stable failure reason.
     * @param message - Human-readable message.
     * @param details - Registry scope and, when relevant, the offending id.
     */
    constructor(code, message, details) {
        super(message);
        this.name = "RegistryError";
        this.code = code;
        this.scope = details.scope;
        this.id = details.id;
    }
}
//# sourceMappingURL=RegistryError.js.map