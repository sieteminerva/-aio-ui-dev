/** Machine-readable failure reasons raised by the registry kernel. */
export type RegistryErrorCode =
  | "DUPLICATE_ID"
  | "INVALID_ID"
  | "INVALID_SCOPE"
  | "MISSING_ENTRY"
  | "MISSING_DEPENDENCY"
  | "CYCLIC_DEPENDENCY";

/** Extra context attached to a {@link RegistryError}. */
export interface iRegistryErrorDetails {
  /** Registry scope that raised the error. */
  scope: string;

  /** Offending id, when the failure is id-specific. */
  id?: string;
}

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
  public readonly code: RegistryErrorCode;

  /** Registry scope that raised the error. */
  public readonly scope: string;

  /** Offending id, when the failure is id-specific. */
  public readonly id?: string;

  /**
   * @param code - Stable failure reason.
   * @param message - Human-readable message.
   * @param details - Registry scope and, when relevant, the offending id.
   */
  constructor(code: RegistryErrorCode, message: string, details: iRegistryErrorDetails) {
    super(message);
    this.name = "RegistryError";
    this.code = code;
    this.scope = details.scope;
    this.id = details.id;
  }
}
