export interface ActionProperty {
    tagName?: string;
    className: string;
}
export interface HorizontalScrollingConfig {
    bottomZoneHeight: number;
    horizontalMultiplier: number;
    fallbackMultiplier: number;
    defaultSectionName: string;
    autoInjectNavLayout: boolean;
    selectors: Record<string, ActionProperty>;
    onNavFound: (navElement: HTMLElement, toggleButton: HTMLButtonElement) => void;
}
export declare class HorizontalScrollingPage {
    private config;
    private currentShell;
    private menuRef;
    private toggleButton;
    private timelineLabelElement;
    private panelElementsCache;
    private styleElement;
    private scrollTimeout;
    private panelListeners;
    private resizeListener;
    private touchStartX;
    private touchStartY;
    private scrollLeftStart;
    constructor(config?: Partial<HorizontalScrollingConfig>);
    private resolveSelector;
    private wheelHijackListener;
    private mouseMoveListener;
    private mouseLeaveListener;
    private touchStartListener;
    private touchMoveListener;
    private pageScrollListener;
    private injectDynamicStyles;
    private createTimelineLabel;
    activate(shell: HTMLElement, elements: HTMLElement[] | HTMLCollection): void;
    deactivate(shell: HTMLElement): void;
}
//# sourceMappingURL=HorizontalScrolling.d.ts.map