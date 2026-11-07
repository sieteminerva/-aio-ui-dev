/**
 * Aggregated type barrel for `@aio-ui/core`.
 *
 * Kept so existing `@aio-ui/core/interface` imports keep working. New code should
 * import from the topic entry that owns the contract:
 *
 * - `@aio-ui/core/node`     — DOM and node tree contracts
 * - `@aio-ui/core/builder`  — builder configuration
 * - `@aio-ui/core/registry` — component map and builder function shape
 * - `@aio-ui/core/content`  — content item shapes
 * - `@aio-ui/core/page`     — page sources, theme modules, page reports
 * - `@aio-ui/core/renderer` — renderer contracts
 */
export * from "./types/renderer";
export * from "./types/api";
export * from "./types/content";
export * from "./types/node";
export * from "./types/registry";
export * from "./types/builder";
export * from "./types/page";
