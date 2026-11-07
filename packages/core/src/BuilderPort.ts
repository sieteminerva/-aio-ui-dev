/**
 * Builder port for the component registry.
 *
 * `ComponentRegistry` lives in `@aio-ui/core` and must not import `@aio-ui/base`.
 * The only two builder operations it needs are declared here and implemented by
 * `@aio-ui/base`, which plugs itself in when its module is evaluated. The
 * dependency direction therefore stays `base → core`.
 *
 * Without a plugged adapter both members are no-ops: a host that registers no
 * component never triggers either path.
 */
export interface iBuilderAdapter {
  /** Clears per-component identity counters so a rebuild starts from a clean slate. */
  resetCounters(): void;
  /**
   * Releases the anti-FOUC hold markers on a freshly built element.
   *
   * @param instance - The builder instance that produced the element, if any.
   * @param element - The element the registry is about to hand back to the caller.
   */
  releaseHydration(instance: unknown, element?: HTMLElement | null): void;
}

let builderAdapter: iBuilderAdapter | null = null;

/**
 * @summary Plug an implementation into the builder port.
 * @param adapter - The adapter to use, or `null` to detach it again.
 */
export function setBuilderAdapter(adapter: iBuilderAdapter | null): void {
  builderAdapter = adapter;
}

/**
 * @summary Read the currently plugged adapter.
 * @returns The active adapter, or `null` when no builder package has loaded yet.
 */
export function getBuilderAdapter(): iBuilderAdapter | null {
  return builderAdapter;
}
