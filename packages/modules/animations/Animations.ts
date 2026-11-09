import "./Animations.css";
import type { TypewriterOptions } from "./behaviours/typewriter";
import type { StaggerFadeOptions } from "./behaviours/stagger-fade";
import type { FadeInOptions } from "./behaviours/fade-in";
import type { ScrambleOptions } from "./behaviours/scramble";
import type { LoadingPlaceholderOptions } from "./behaviours/loading-placeholder";
import type { AnimationBehaviour } from "./behaviours/types";
import { ANIMATION_BEHAVIOURS, indexBehaviours } from "./behaviours/registry";

export type { AnimationBehaviour, AnimationContext } from "./behaviours/types";
export { ANIMATION_BEHAVIOURS, ANIMATION_TYPES } from "./behaviours/registry";

export interface AnimationServiceConfig {
  typewriter?: TypewriterOptions;
  staggerFade?: Partial<StaggerFadeOptions>;
  scramble?: Partial<ScrambleOptions>;
  fade?: Partial<FadeInOptions>;
  loadingPlaceholder?: Partial<LoadingPlaceholderOptions>;
  delay?: number; // Properti global di level atas
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
export class AnimationsService {
  /** Slot this class fills when registered as an app module. */
  static readonly slot = "animation" as const;

  private globalDelay: number;
  public config: Partial<AnimationServiceConfig>;

  /** Registry of all active animation records keyed by element */
  private records: Map<HTMLElement, AnimationRecord> = new Map();

  /** Ordered list of chained elements per execution scope (e.g. fieldset, form, section) */
  private scopes: Map<HTMLElement, HTMLElement[]> = new Map();

  /** Native DOM observers */
  private mutationObserver: MutationObserver | null = null;
  private viewObserver: IntersectionObserver | null = null;

  /** `animation` attribute value → behaviour definition. */
  readonly #behaviours: Map<string, AnimationBehaviour<any>>;

  /** Added nodes waiting for the batched scan (one rAF per mutation batch). */
  #pendingScan: Set<HTMLElement> = new Set();
  #scanFrame: number | null = null;

  constructor(config: AnimationServiceConfig = {}) {
    this.#behaviours = indexBehaviours([...ANIMATION_BEHAVIOURS, ...(config.behaviours ?? [])]);

    this.globalDelay = config.delay ?? 500;
    this.config = {
      typewriter: {
        loop: config.typewriter?.loop ?? false,
        interval: config.typewriter?.interval ?? 30,
        delay: config.typewriter?.delay ?? this.globalDelay,
        rewrite: config.typewriter?.rewrite ?? false,
      },
      fade: {
        duration: config.fade?.duration ?? '0.5s',
      },
      staggerFade: {
        delay: config.staggerFade?.delay ?? 5000,
        duration: config.staggerFade?.duration ?? '0.6s',
      },
      scramble: {
        chars: config.scramble?.chars ?? '!<>-_\\/[]{}—=+*^?#________',
        speed: config.scramble?.speed ?? 40,
      },
      loadingPlaceholder: {
        duration: config.loadingPlaceholder?.duration ?? this.globalDelay,
      },
      ...config
    };

    this._observeMutations();
  }

  // =========================================================================
  // PUBLIC LIFECYCLE API (Base.ts Single-Word Pattern)
  // =========================================================================

  /**
   * Initializes the animation engine, scanning the target root and establishing observers.
   */
  public init(root: ParentNode = document.body): this {
    this.scan(root);
    return this;
  }

  /**
   * Registers a behaviour at runtime, keyed by its `type`.
   *
   * Overrides an existing type deliberately: the engine keeps one definition per
   * attribute value, so a host can restyle `fade-in` without touching the DOM.
   *
   * @returns This service, for chaining.
   */
  public use(behaviour: AnimationBehaviour<any>): this {
    if (!behaviour?.type) {
      throw new Error('[AnimationsService] A behaviour definition is missing its `type`.');
    }
    this.#behaviours.set(behaviour.type, behaviour);
    return this;
  }

  /** The `animation` attribute values this service can currently run. */
  public get types(): string[] {
    return [...this.#behaviours.keys()];
  }

  /**
   * Scans a subtree for elements with `[animation]` in document order and mounts them.
   */
  public scan(root: ParentNode = document.body): HTMLElement[] {
    if (!root || typeof root.querySelectorAll !== 'function') return [];

    const nodes: HTMLElement[] = [];
    if (root instanceof HTMLElement && root.hasAttribute('animation')) {
      nodes.push(root);
    }
    nodes.push(...Array.from(root.querySelectorAll<HTMLElement>('[animation]')));

    nodes.forEach((node) => this.mount(node));

    // Kick off any visible scopes or unchained nodes after scan is complete
    this.scopes.forEach((_, scope) => {
      if (this._inViewport(scope)) {
        this._startScope(scope);
      }
    });

    nodes.forEach((node) => {
      const rec = this.records.get(node);
      if (rec && !rec.chained && this._inViewport(node)) {
        this.trigger(node);
      }
    });

    return nodes;
  }

  /**
   * Mounts a single animated node into the registry and configures its initial state.
   */
  public mount(node: HTMLElement): void {
    if (this.records.has(node)) return;

    const type = node.getAttribute('animation') || '';
    if (!this.#behaviours.has(type)) {
      console.warn(`[AnimationsService] Unknown animation type: "${type}"`);
      return;
    }

    const chained = node.getAttribute('animation-chain') === 'true';
    const once = node.getAttribute('animated-once') === 'true';
    const scope = this._scope(node);

    const snapshot = {
      opacity: node.style.opacity,
      pointerEvents: node.style.pointerEvents,
      html: node.innerHTML,
      text: node.textContent || '',
    };

    const record: AnimationRecord = {
      node,
      type,
      chained,
      once,
      played: false,
      scope,
      state: chained ? 'waiting' : 'idle',
      snapshot,
      controller: new AbortController(),
    };

    if (chained) {
      let chainList = this.scopes.get(scope);
      if (!chainList) {
        chainList = [];
        this.scopes.set(scope, chainList);
      }
      if (!chainList.includes(node)) {
        chainList.push(node);
        chainList.sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
      }

      // Hanya sembunyikan via JS elemen yang menunggu pendahulunya (bukan
      // urutan pertama). fade-in & typewriter cukup dipre-hide CSS via
      // visibility:hidden — JS tidak perlu menimpa opacity-nya.
      if (chainList.indexOf(node) > 0 && type !== 'fade-in' && type !== 'typewriter') {
        node.style.opacity = '0';
        node.style.pointerEvents = 'none';
      }
    }

    this.records.set(node, record);
    this.observe(node);
  }

  /**
   * Unmounts a node, canceling any active animation and cleaning up registry references.
   */
  public unmount(node: HTMLElement): void {
    const rec = this.records.get(node);
    if (!rec) return;

    this.stop(node);

    if (rec.chained) {
      const chainList = this.scopes.get(rec.scope);
      if (chainList) {
        const idx = chainList.indexOf(node);
        if (idx !== -1) chainList.splice(idx, 1);
        if (chainList.length === 0) {
          this.scopes.delete(rec.scope);
          // Observers hold strong references to their targets: a scope that is
          // left observed after its last chained node is gone pins the whole
          // detached page in memory and keeps firing callbacks on it.
          this.viewObserver?.unobserve(rec.scope);
        }
      }
    } else {
      this.viewObserver?.unobserve(node);
    }

    this.records.delete(node);
  }

  /**
   * Observes a node or its host container for viewport visibility.
   */
  public observe(node: HTMLElement): void {
    this._ensureViewObserver();

    const rec = this.records.get(node);
    if (!rec) return;

    if (rec.chained) {
      // For chained elements, observe the scope container (e.g. fieldset, form, section)
      this.viewObserver?.observe(rec.scope);
    } else {
      // Pre-hide memakai visibility:hidden (bukan display:none), jadi setiap
      // elemen selalu punya kotak layout — cukup amati elemennya langsung.
      this.viewObserver?.observe(node);
    }
  }

  /**
   * Unobserves the element a record actually observes — for chained nodes that is
   * the scope container, not the node itself.
   */
  public unobserve(node: HTMLElement): void {
    if (!this.viewObserver) return;
    const rec = this.records.get(node);
    this.viewObserver.unobserve(rec?.chained ? rec.scope : node);
  }

  /**
   * Executes the appropriate animation behaviour for a node.
   */
  public trigger(node: HTMLElement): void {
    const rec = this.records.get(node);
    if (!rec) return;

    // animated-once: elemen yang sudah pernah diputar TIDAK pernah diputar ulang.
    if (rec.once && rec.played) return;

    const behaviour = this.#behaviours.get(rec.type);
    if (!behaviour) return;

    // Setiap run memiliki controller sendiri: run lama di-abort lebih dulu supaya
    // perilakunya benar-benar berhenti (timer, listener, rAF) sebelum run baru mulai.
    if (rec.state === 'running') {
      this.stop(node);
    }

    rec.state = 'running';
    rec.played = true;
    rec.controller = new AbortController();

    const signal = rec.controller.signal;

    // Release pre-hide suppression styles so element becomes visible
    this._release(node, rec.snapshot);

    const isStopped = (): boolean => signal.aborted || !node.isConnected;

    // done() must be idempotent: behaviours may report completion per segment.
    let reported = false;
    const done = (target?: HTMLElement): void => {
      if (reported || rec.state !== 'running') return;
      reported = true;
      rec.state = 'done';
      this._dispatch(target ?? node, 'animation:done');

      if (rec.chained) {
        this.next(rec.scope);
      }
    };

    const context = {
      node,
      options: this._optionsOf(behaviour),
      delay: this._delay(node),
      signal,
      stopped: isStopped,
      done,
    };

    try {
      const result = behaviour.animate(context);
      // Async behaviours must never surface as unhandled rejections.
      if (result && typeof (result as Promise<unknown>).catch === 'function') {
        (result as Promise<unknown>).catch((error: unknown) => {
          if (!isStopped()) {
            console.error(`[AnimationsService] Behaviour "${rec.type}" failed:`, error);
          }
        });
      }
    } catch (error) {
      console.error(`[AnimationsService] Behaviour "${rec.type}" failed:`, error);
      rec.state = 'idle';
    }
  }

  /**
   * Advances a chain sequence in a scope by triggering the next waiting element in document order.
   */
  public next(scope: HTMLElement): void {
    const chain = this.scopes.get(scope);
    if (!chain || chain.length === 0) return;

    const nextNode = chain.find((n) => {
      const rec = this.records.get(n);
      return rec && (rec.state === 'waiting' || rec.state === 'idle');
    });

    if (!nextNode) {
      this._dispatch(scope, 'animation:scope-done');
      return;
    }

    this.trigger(nextNode);
  }

  /**
   * Stops an active animation on a node.
   */
  public stop(node: HTMLElement): void {
    const rec = this.records.get(node);
    if (!rec) return;

    rec.controller.abort();
    if (rec.state === 'running') {
      rec.state = 'idle';
    }

    if (typeof node.getAnimations === 'function') {
      node.getAnimations().forEach((anim) => anim.cancel());
    }
  }

  /**
   * Resets element(s) to initial state, enabling replay when the viewport or page is revisited.
   */
  public reset(target?: HTMLElement | ParentNode): void {
    if (!target) {
      this.records.forEach((_, node) => this._resetNode(node));
      return;
    }

    if (target instanceof HTMLElement && this.records.has(target)) {
      this._resetNode(target);
      return;
    }

    this.records.forEach((_, node) => {
      if (target.contains(node) || target === node) {
        this._resetNode(node);
      }
    });
  }

  /**
   * Clears state for elements that have left the viewport or page. Alias for reset.
   */
  public clear(target?: HTMLElement | ParentNode): void {
    this.reset(target);
  }

  /**
   * Releases loading placeholders frozen by lazy-loading anti-FOUC guards.
   */
  public release(root: ParentNode = document.body): void {
    if (!root || typeof root.querySelectorAll !== 'function') return;
    const heldNodes = root.querySelectorAll<HTMLElement>('[animation="loading-placeholder"]');
    heldNodes.forEach((node) => this.trigger(node));
  }

  /**
   * Backwards-compatibility alias for release().
   */
  public releaseLoadingPlaceholders(root: ParentNode = document.body): void {
    this.release(root);
  }

  /**
   * Disconnects observers, stops all running animations, and clears internal maps.
   */
  public destroy(): void {
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
      this.mutationObserver = null;
    }
    if (this.viewObserver) {
      this.viewObserver.disconnect();
      this.viewObserver = null;
    }

    this.records.forEach((rec, node) => {
      rec.controller.abort();
      this.stop(node);
    });

    if (this.#scanFrame !== null) {
      cancelAnimationFrame(this.#scanFrame);
      this.#scanFrame = null;
    }
    this.#pendingScan.clear();

    this.records.clear();
    this.scopes.clear();
  }

  // =========================================================================
  // INTERNAL HELPERS
  // =========================================================================

  private _ensureViewObserver(): void {
    if (this.viewObserver) return;

    this.viewObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const target = entry.target as HTMLElement;

        // A detached scope never becomes visible again; reacting to it would
        // keep animating a page the user already left.
        if (!target.isConnected) return;

        if (entry.isIntersecting) {
          // A. Target is a registered scope holding chained elements
          if (this.scopes.has(target)) {
            this._startScope(target);
          }

          // B. Target is a registered individual element
          const rec = this.records.get(target);
          if (rec && !rec.chained && rec.state === 'idle') {
            this.trigger(target);
          }
        } else {
          // Do not reset chained scopes while scrolling. Their children can
          // still be typing, and resetting the whole section changes layout
          // while the observer is processing the exit.
          if (this.records.has(target)) {
            this.reset(target);
          }
        }
      });
    }, { threshold: 0 });
  }

  private _startScope(scope: HTMLElement): void {
    const chain = this.scopes.get(scope);
    if (!chain || chain.length === 0) return;

    const isAnyRunning = chain.some((n) => this.records.get(n)?.state === 'running');
    if (isAnyRunning) return;

    const isAllDone = chain.every((n) => this.records.get(n)?.state === 'done');
    if (isAllDone) return;

    this.next(scope);
  }

  private _resetNode(node: HTMLElement): void {
    const rec = this.records.get(node);
    if (!rec) return;

    // animated-once: sekali diputar, jangan pernah di-reset (tak akan replay
    // saat keluar-masuk viewport). State dipertahankan 'done' / selesai.
    if (rec.once && rec.played) return;

    this.stop(node);

    if (rec.chained) {
      rec.state = 'waiting';
      node.style.opacity = '0';
      node.style.pointerEvents = 'none';
    } else {
      rec.state = 'idle';
      if (rec.snapshot.opacity !== '') node.style.opacity = rec.snapshot.opacity;
      else node.style.removeProperty('opacity');
      if (rec.snapshot.pointerEvents !== '') node.style.pointerEvents = rec.snapshot.pointerEvents;
      else node.style.removeProperty('pointer-events');
    }

    if (rec.type === 'typewriter' && rec.snapshot.html !== undefined) {
      node.innerHTML = rec.snapshot.html;
      node.classList.remove('tw-writing');
    } else if (rec.type === 'text-scramble' && rec.snapshot.text !== undefined) {
      node.textContent = rec.snapshot.text;
    }

    // Lepas inline visibility peninggalan sesi animasi sebelumnya agar rule
    // pre-hide visibility:hidden (fade-in & typewriter) berlaku lagi selama
    // menunggu re-trigger — replay tanpa kilatan konten penuh.
    node.style.removeProperty('visibility');
  }

  private _release(node: HTMLElement, snapshot: AnimationRecord['snapshot']): void {
    if (snapshot.pointerEvents !== '') {
      node.style.pointerEvents = snapshot.pointerEvents;
    } else {
      node.style.removeProperty('pointer-events');
    }

    if (snapshot.opacity !== '') {
      node.style.opacity = snapshot.opacity;
    } else {
      node.style.removeProperty('opacity');
    }
  }

  private _scope(node: HTMLElement): HTMLElement {
    const boundary = node.closest('fieldset, form, section, article, dialog, aside, header, footer, main, [data-animation-scope]');
    return (boundary as HTMLElement) || document.body;
  }

  private _inViewport(el: HTMLElement): boolean {
    const rect = el.getBoundingClientRect();
    return (
      rect.bottom > 0 &&
      rect.right > 0 &&
      rect.top < (window.innerHeight || document.documentElement.clientHeight) &&
      rect.left < (window.innerWidth || document.documentElement.clientWidth) &&
      rect.width > 0 &&
      rect.height > 0
    );
  }

  private _delay(node: HTMLElement): number {
    if (!node.hasAttribute('data-delay')) return this.globalDelay;
    // parseInt('') is NaN: fall back instead of passing NaN into a behaviour.
    const parsed = parseInt(node.getAttribute('data-delay') || '', 10);
    return Number.isFinite(parsed) ? parsed : this.globalDelay;
  }

  /**
   * Resolves a behaviour's options: definition defaults first, then the config
   * block for this behaviour (keyed by `optionKey`, else by `type`).
   */
  private _optionsOf<O>(behaviour: AnimationBehaviour<O>): O {
    const key = behaviour.optionKey ?? behaviour.type;
    const provided = (this.config as Record<string, unknown>)[key] as Partial<O> | undefined;
    return { ...(behaviour.defaults ?? {}), ...(provided ?? {}) } as O;
  }

  private _dispatch(node: HTMLElement, eventName: string, detail?: any): void {
    const event = new CustomEvent(eventName, {
      bubbles: true,
      composed: true,
      detail: { origin: node, ...detail }
    });
    node.dispatchEvent(event);
  }

  private _observeMutations(): void {
    this.mutationObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.removedNodes.forEach((node) => {
          if (!(node instanceof HTMLElement)) return;
          if (this.records.has(node)) {
            this.unmount(node);
          }
          node.querySelectorAll<HTMLElement>('[animation]').forEach((child) => {
            this.unmount(child);
          });
        });

        mutation.addedNodes.forEach((node) => {
          if (!(node instanceof HTMLElement)) return;
          this._queueScan(node);
        });
      });
    });

    this.mutationObserver.observe(document.body, { childList: true, subtree: true });
  }

  /**
   * Batches added nodes into one scan.
   *
   * The previous implementation scheduled two animation frames *per node*, so a
   * single page swap queued hundreds of callbacks. Collecting the roots first
   * keeps the cost proportional to the number of mutations, not nodes.
   */
  private _queueScan(root: HTMLElement): void {
    this.#pendingScan.add(root);
    if (this.#scanFrame !== null) return;

    this.#scanFrame = requestAnimationFrame(() => {
      this.#scanFrame = requestAnimationFrame(() => {
        this.#scanFrame = null;

        const roots = [...this.#pendingScan];
        this.#pendingScan.clear();

        roots.forEach((node) => {
          if (node.isConnected) this.scan(node);
        });
      });
    });
  }
}
