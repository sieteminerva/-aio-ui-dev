/**
 * Renderer contracts and the global display-log switch.
 */
export declare const GLOBAL_DISPLAY_LOG = false;
export interface iRendererLite {
    create: () => void;
    append: () => void;
    remove: () => void;
    replace: () => void;
    text: () => void;
    html: () => void;
    attr: () => void;
    class: () => void;
}
//# sourceMappingURL=renderer.d.ts.map