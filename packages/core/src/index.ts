/**
 * Public surface of `@aio-ui/core` — curated, never `export *`.
 *
 * Two kinds of names live here:
 *
 * - **runtime** — the renderer, the registry kernel, the stylesheet injector, the builder
 *   port and the template registry. Components and modules use these; nothing else.
 * - **contracts** — the type modules (`iBasicNode`, `iComponentEvents`, …) are also
 *   published as types-only subpaths (`@aio-ui/core/interface`, `/node`, `/page`, …) for
 *   hosts that want one module of types without the runtime. Those subpaths contain types
 *   only, which is why they are allowed to stay.
 */

// ---- runtime -------------------------------------------------------------
export { ComponentRegistry, mergeBuildConfig } from "./ComponentRegistry";
export { DOMRenderer } from "./DOMRenderer";
export { getBuilderAdapter, setBuilderAdapter } from "./BuilderPort";
export {
  ensureStylesheet,
  injectLazyCss,
  isStyleInjected,
  normalizeStylesheetPath,
  styleTagId,
  useStylesheetAssets,
} from "./Stylesheets";
export { TemplateRegistry, getTemplates, setTemplates } from "./TemplateRegistry";
export {
  DEFAULT_REGISTRY_SCOPE,
  Registry,
  RegistryError,
  assertValidId,
  assertValidScope,
  qualifyId,
  splitQualifiedId,
} from "./Registry/index";

// ---- contracts -----------------------------------------------------------
export type { iComponentAssetMaps, iComponentManifest, iComponentModuleRef, RegisterFn } from "./ComponentRegistry";
export type { iBuilderAdapter } from "./BuilderPort";
export type { iStyleLoader } from "./Stylesheets";
export type { TemplateHandler } from "./TemplateRegistry";
export type {
  RegistryDuplicatePolicy,
  RegistryErrorCode,
  iRegistryEntry,
  iRegistryErrorDetails,
  iRegistryLike,
  iRegistryOptions,
} from "./Registry/index";
export type { iComponentEvents, iEventCallback, iEventEmit, iPageEvents, iPagePhase } from "./types/events";
