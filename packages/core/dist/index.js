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
export { ComponentRegistry, mergeBuildConfig } from "./ComponentRegistry.js";
export { DOMRenderer } from "./DOMRenderer.js";
export { getBuilderAdapter, setBuilderAdapter } from "./BuilderPort.js";
export { ensureStylesheet, injectLazyCss, isStyleInjected, normalizeStylesheetPath, styleTagId, useStylesheetAssets, } from "./Stylesheets.js";
export { TemplateRegistry, getTemplates, setTemplates } from "./TemplateRegistry.js";
export { DEFAULT_REGISTRY_SCOPE, Registry, RegistryError, assertValidId, assertValidScope, qualifyId, splitQualifiedId, } from "./Registry/index.js";
//# sourceMappingURL=index.js.map