export interface iRouteState {
    route: string;
    theme: string | null;
    fragment: string;
}
/** Options a host may define itself when the router is used standalone. */
export interface iHashRouterConfig {
    defaultRoute?: string;
    initialTheme?: string;
    validRoutes?: string[];
    onRouteChanged?: (state: iRouteState) => void | Promise<void>;
}
/**
 * Runtime data supplied by the host that owns the router.
 *
 * Structurally identical to `iAppModuleContext` in `@aio-ui/app`, but declared here
 * so this package never imports the app.
 */
export interface iHashRouterContext extends iHashRouterConfig {
    theme?: string;
    routes?: string[];
}
export declare class HashRouter {
    /** Slot this class fills when registered as an app module. */
    static readonly slot: "router";
    private defaultRoute;
    private currentThemeId;
    onRouteChanged: (state: iRouteState) => void | Promise<void>;
    private validRoutes;
    /**
     * @param config - Options for standalone use (`{ defaultRoute, initialTheme, validRoutes, onRouteChanged }`).
     * @param context - Host-supplied runtime data; wins over `config` when both are given.
     */
    constructor(config?: iHashRouterConfig, context?: iHashRouterContext);
    redirect(targetRoute: string, themeId?: string | null, fragmentId?: string): iRouteState;
    navigate(routeId: string, themeId?: string | null, fragmentId?: string, _isValidRoute?: boolean): void;
    parseUrlHash(): iRouteState;
    /**
     * Mengupdate daftar rute yang valid secara dinamis (misalnya ketika mendaftarkan controller baru)
     */
    updateValidRoutes(validRoutes: string[]): void;
    updateValidRoute(route: string): void;
    /**
   * Pembersih memory leak saat instance dihancurkan
   */
    destroy(): void;
    /**
     * HELPER
     */
    private _normalizeRoute;
    private _normalizeTheme;
    private _buildHash;
    private _safeDecode;
    private _syncAddressBar;
    private _handleHashChange;
}
//# sourceMappingURL=HashRouter.d.ts.map