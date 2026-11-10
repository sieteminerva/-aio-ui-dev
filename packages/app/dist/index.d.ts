/**
 * Public surface of `@aio-ui/app`.
 *
 * `AioApp` is the framework entry: one class that owns routing, preload, render,
 * lifecycle and teardown. `iApp` is its contract; `iAppConfig`, `iAppSource`,
 * `iAppOptions` and `iAppDeps` describe what the entry receives.
 */
export { AioApp, blockToNode, isPageDocument, normalizeRoute, pageToNode } from "./AioApp";
export { AppStorage } from "./modules";
export type { iStorageConfig, iStorageDriver } from "./modules";
export type { iApp, iAppConfig, iAppModuleClass, iAppModuleContext, iAppOptions, iAppSlot, iAppSlots, iAppSource, iPageBlock, iPageContent, iPageContext, iPageController, iPageControllerClass, iPageDocument, iPageReadyContext, } from "./types";
export type { iAnimationPort, iAppRouteState, iComponentRegistryPort, iEventPort, iHttpPort, iRendererPort, iRouterFactory, iRouterPort, iStoragePort, } from "./ports";
//# sourceMappingURL=index.d.ts.map