import "./Animations.css";
import type { TypewriterOptions } from "./behaviours/typewriter";
import type { StaggerFadeOptions } from "./behaviours/stagger-fade";
import type { FadeInOptions } from "./behaviours/fade-in";
import type { ScrambleOptions } from "./behaviours/scramble";
import type { LoadingPlaceholderOptions } from "./behaviours/loading-placeholder";
import type { AnimationBehaviour } from "./behaviours/types";
export type { AnimationBehaviour, AnimationContext } from "./behaviours/types";
export { ANIMATION_BEHAVIOURS, ANIMATION_TYPES } from "./behaviours/registry";
export interface AnimationServiceConfig {
    typewriter?: TypewriterOptions;
    staggerFade?: Partial<StaggerFadeOptions>;
    scramble?: Partial<ScrambleOptions>;
    fade?: Partial<FadeInOptions>;
    loadingPlaceholder?: Partial<LoadingPlaceholderOptions>;
    delay?: number;
    /**
     * Extra behaviours registered at construction time. They extend (or override)
     * the built-in set; use `AnimationsService.use()` to add one after construction.
     */
    behaviours?: readonly AnimationBehaviour<any>[];
}
export type AnimationState = 'idle' | 'waiting' | 'running' | 'done';
export interface AnimationRecord {
    node: HTMLElement;
    type: string;
    chained: boolean;
    /** animated-once="true" → elemen hanya boleh diputar sekali, tak pernah replay */
    once: boolean;
    /** true setelah node mulai diputar pertamakali (basis penentuan "sudah pernah dimainkan") */
    played: boolean;
    scope: HTMLElement;
    state: AnimationState;
    snapshot: {
        opacity: string;
        pointerEvents: string;
        html?: string;
        text?: string;
    };
    /**
     * Cancels the current run. Aborted on stop, unmount and destroy, so behaviours
     * can release timers, listeners and animation frames through one channel.
     */
    controller: AbortController;
}
/**
 * AnimationsService — unified lifecycle and execution engine for declarative DOM animations.
 *
 * Implements tree-agnostic document-order sequencing, WeakMap/Map node tracking,
 * dynamic mutation discovery, and viewport intersection entry/exit management.
 */
export declare class AnimationsService {
    #private;
    /** Slot this class fills when registered as an app module. */
    static readonly slot: "animation";
    private globalDelay;
    config: Partial<AnimationServiceConfig>;
    /** Registry of all active animation records keyed by element */
    private records;
    /** Ordered list of chained elements per execution scope (e.g. fieldset, form, section) */
    private scopes;
    /** Native DOM observers */
    private mutationObserver;
    private viewObserver;
    constructor(config?: AnimationServiceConfig);
    /**
     * Initializes the animation engine, scanning the target root and establishing observers.
     */
    init(root?: ParentNode): this;
    /**
     * Registers a behaviour at runtime, keyed by its `type`.
     *
     * Overrides an existing type deliberately: the engine keeps one definition per
     * attribute value, so a host can restyle `fade-in` without touching the DOM.
     *
     * @returns This service, for chaining.
     */
    use(behaviour: AnimationBehaviour<any>): this;
    /** The `animation` attribute values this service can currently run. */
    get types(): string[];
    /**
     * Scans a subtree for elements with `[animation]` in document order and mounts them.
     */
    scan(root?: ParentNode): HTMLElement[];
    /**
     * Mounts a single animated node into the registry and configures its initial state.
     */
    mount(node: HTMLElement): void;
    /**
     * Unmounts a node, canceling any active animation and cleaning up registry references.
     */
    unmount(node: HTMLElement): void;
    /**
     * Observes a node or its host container for viewport visibility.
     */
    observe(node: HTMLElement): void;
    /**
     * Unobserves the element a record actually observes — for chained nodes that is
     * the scope container, not the node itself.
     */
    unobserve(node: HTMLElement): void;
    /**
     * Executes the appropriate animation behaviour for a node.
     */
    trigger(node: HTMLElement): void;
    /**
     * Advances a chain sequence in a scope by triggering the next waiting element in document order.
     */
    next(scope: HTMLElement): void;
    /**
     * Stops an active animation on a node.
     */
    stop(node: HTMLElement): void;
    /**
     * Resets element(s) to initial state, enabling replay when the viewport or page is revisited.
     */
    reset(target?: HTMLElement | ParentNode): void;
    /**
     * Clears state for elements that have left the viewport or page. Alias for reset.
     */
    clear(target?: HTMLElement | ParentNode): void;
    /**
     * Releases loading placeholders frozen by lazy-loading anti-FOUC guards.
     */
    release(root?: ParentNode): void;
    /**
     * Backwards-compatibility alias for release().
     */
    releaseLoadingPlaceholders(root?: ParentNode): void;
    /**
     * Disconnects observers, stops all running animations, and clears internal maps.
     */
    destroy(): void;
    private _ensureViewObserver;
    private _startScope;
    private _resetNode;
    private _release;
    private _scope;
    private _inViewport;
    private _delay;
    /**
     * Resolves a behaviour's options: definition defaults first, then the config
     * block for this behaviour (keyed by `optionKey`, else by `type`).
     */
    private _optionsOf;
    private _dispatch;
    private _observeMutations;
    /**
     * Batches added nodes into one scan.
     *
     * The previous implementation scheduled two animation frames *per node*, so a
     * single page swap queued hundreds of callbacks. Collecting the roots first
     * keeps the cost proportional to the number of mutations, not nodes.
     */
    private _queueScan;
}
//# sourceMappingURL=Animations.d.ts.map