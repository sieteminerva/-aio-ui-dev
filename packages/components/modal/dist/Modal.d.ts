import type { iBuilderConfig, iBuilderRegistry } from "@aio-ui/core/interface";
import { Builder } from "@aio-ui/base";
export type ModalElementType = "@container" | "@modal" | "@modal>header" | "@modal>closeBtn";
export interface iModalConfig extends iBuilderConfig<ModalElementType> {
    id: string;
    title?: string;
    destroyOnClose: boolean;
    className?: string;
    modalClass?: string;
    onOpen?: (el: HTMLElement) => void;
    onClose?: (el: HTMLElement) => void;
    /**
     * Receives the control handles once the overlay exists.
     *
     * This is how a caller opens a modal: `build()` now returns the element, so the
     * handles have to arrive some other way than the return value.
     */
    onReady?: (controls: iModalControls) => void;
}
/** What a caller gets to drive an open modal. */
export interface iModalControls {
    element: HTMLElement;
    open: () => void;
    close: () => void;
    unmount: () => void;
}
export declare class ModalBuilder extends Builder<ModalElementType, iModalConfig> {
    #private;
    readonly builderId: keyof iBuilderRegistry;
    readonly name: keyof iBuilderRegistry;
    readonly stylesheet: string;
    currentModal: HTMLElement | null;
    /** Kept so teardown removes exactly the listener that was added. */
    private closeBtn;
    private readonly handleCloseClick;
    private readonly handleBackdropClick;
    constructor(config?: Partial<iModalConfig>);
    /**
     * Builds the overlay and returns it.
     *
     * Three things changed from the version that misbehaved:
     *
     * 1. it **returns the element** instead of control handles, so the registry can mount
     *    it (`build()` requires an element); the handles now arrive through `onReady`;
     * 2. it no longer appends itself to `document.body` — whoever renders it decides
     *    where it lives, which is what made overlays stack up before;
     * 3. a leftover node with the same id is **removed first**, so the id always has
     *    exactly one owner instead of silently reusing a stale element.
     */
    prepare(contentPayload: any): HTMLElement;
    /** Attaches the two ways out, using references that teardown can remove. */
    private bind;
    /** Removes exactly the listeners `bind()` added. */
    private unbind;
    protected template(typeKey: ModalElementType, el: HTMLElement, _payload?: any): void;
    /**
     * Kept for compatibility: listeners are bound in `prepare()`, so nothing happens here.
     * Binding lazily is what made a reused element arrive without working listeners.
     */
    initialize(_el?: HTMLElement, _payload?: any, _context?: any): void;
    /** Whether this instance has been torn down. A destroyed modal cannot be reopened. */
    get isDestroyed(): boolean;
    open(): void;
    close(): void;
    private _compileContent;
    private _getControlInterfaces;
    /**
     * Releases everything this builder owns. Idempotent on purpose: it is called by
     * `close()` (when `destroyOnClose`), by a controller, and by route teardown.
     */
    destroy(): void;
    /** Alias kept so existing callers keep working. */
    unmount(): void;
}
//# sourceMappingURL=Modal.d.ts.map