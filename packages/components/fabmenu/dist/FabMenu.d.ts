import type { iElementProperty, iBasicNode, iBuilderConfig, iBuilderRegistry } from "@aio-ui/core/interface";
import { Builder } from "@aio-ui/base";
export type FabPosition = "top-left" | "top-right" | "bottom-left" | "bottom-right" | "middle";
export type FabMenuElementType = "@fab" | "@fab>panel" | "@fab>panel>title" | "@fab>panel>item" | "@fab>panel>trigger";
export interface iFabMenuConfig extends iBuilderConfig<FabMenuElementType> {
    container: string | HTMLElement | null;
    duration: number | null;
    position: FabPosition;
    closeOnSelected: boolean;
    closeIcon: string;
    displayIcon: string;
}
export declare class FabMenuBuilder extends Builder<FabMenuElementType, iFabMenuConfig> {
    readonly builderId: keyof iBuilderRegistry;
    readonly name: keyof iBuilderRegistry;
    readonly stylesheet: string;
    config: Required<iFabMenuConfig>;
    private isMenuOpen;
    private idleTimer;
    constructor(config?: Partial<iFabMenuConfig>);
    prepare(content: iBasicNode, _config?: Partial<iFabMenuConfig>): HTMLElement;
    /**
     * 👑 THE SEPARATED HYDRATION VALVE
     */
    protected template(typeKey: FabMenuElementType, el: HTMLElement, payload: any, props: iElementProperty): void;
    initialize(): void;
    /**
     * 🔓 STATE MANAGEMENT: Membuka panel menu secara reaktif
     */
    open(): void;
    /**
     * 🔒 STATE MANAGEMENT: Menutup panel menu secara reaktif
     */
    close(): void;
    unmount(): void;
    private _resetIdleTimer;
    private _clearIdleTimer;
}
//# sourceMappingURL=FabMenu.d.ts.map