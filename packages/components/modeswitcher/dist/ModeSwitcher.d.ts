import type { iBuilderConfig, iBuilderRegistry } from "@aio-ui/core/interface";
import { Builder } from "@aio-ui/base";
export type ModeSwitcherElementType = "@mode-switcher" | "@mode-switcher>toggle" | "@mode-switcher>track" | "@mode-switcher>thumb" | "@mode-switcher>label";
export interface iModeSwitcherConfig extends iBuilderConfig<ModeSwitcherElementType> {
}
export declare class ModeSwitcherBuilder extends Builder<ModeSwitcherElementType, iModeSwitcherConfig> {
    readonly builderId: keyof iBuilderRegistry;
    readonly name: keyof iBuilderRegistry;
    readonly stylesheet: string;
    private mode;
    config: Required<iModeSwitcherConfig>;
    constructor(config?: Partial<iModeSwitcherConfig>);
    prepare(): HTMLElement;
    protected template(typeKey: ModeSwitcherElementType, el: HTMLElement, _payload?: any): void;
    initialize(): void;
    private normalizeMode;
    getMode(): 'light' | 'dark';
}
//# sourceMappingURL=ModeSwitcher.d.ts.map