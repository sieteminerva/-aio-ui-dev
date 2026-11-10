/**
 * MODUL: ANIMATION BEHAVIOUR CONTRACT
 *
 * Every declarative behaviour (`[animation="…"]` handler) implements the same
 * two-piece contract:
 *
 * 1. A *definition* describing which attribute value selects it and how it runs.
 * 2. An `animate(context)` entry point that receives everything it needs — and
 *    nothing it does not: no engine instance, no registry, no observers.
 *
 * Why a context object instead of positional arguments:
 * - the signature never changes when the engine gains a capability, so third
 *   party behaviours do not break;
 * - `signal` is the single cancellation channel, so long-running behaviours
 *   (loops, timers, canvas frames) can release their resources deterministically
 *   instead of polling a boolean that the engine may forget to reset.
 *
 * Rules of the road for an implementation:
 * - MUST call `done()` exactly once when the effect finishes.
 * - MUST stop touching the DOM once `stopped()` is true (or `signal` aborted).
 * - MUST NOT call `animate` twice on the same node expecting independent runs:
 *   the engine aborts the previous controller before starting a new run.
 */
export interface AnimationContext<O = Record<string, unknown>> {
  /** Element carrying the `animation="…"` attribute. */
  node: HTMLElement;

  /** Behaviour options: definition defaults merged with the service config. */
  options: O;

  /** Node-level delay: `data-delay` when present, otherwise the global default (ms). */
  delay: number;

  /** Aborted when the engine stops, unmounts or destroys this node. */
  signal: AbortSignal;

  /** True once the run was aborted or the node left the DOM. */
  stopped(): boolean;

  /**
   * Reports completion. The engine reacts once per run: later calls are ignored.
   * Pass a target to emit `animation:done` on a sub-element (used by behaviours
   * that complete per segment instead of per node).
   */
  done(target?: HTMLElement): void;
}

export interface AnimationBehaviour<O = Record<string, unknown>> {
  /** The `animation="…"` value that selects this behaviour. */
  readonly type: string;

  /**
   * Key of this behaviour's block in `AnimationServiceConfig`.
   * Defaults to `type`; set it when the config key predates the type name
   * (e.g. `fade` → `fade-in`, `staggerFade` → `stagger-fade`).
   */
  readonly optionKey?: string;

  /** Values applied before the service config, so callers only override what they need. */
  readonly defaults?: Partial<O>;

  /** Runs the effect. Returning a promise lets rejections surface as engine warnings. */
  animate(context: AnimationContext<O>): void | Promise<void>;
}
