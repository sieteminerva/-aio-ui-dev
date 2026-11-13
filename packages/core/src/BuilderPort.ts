/**
 * Builder port for the component registry.
 *
 * `ComponentRegistry` lives in `@aio-ui/core` and must not import `@aio-ui/base`.
 * The only builder operation it needs is declared here and implemented by
 * `@aio-ui/base`, which plugs itself in when its module is evaluated. The
 * dependency direction therefore stays `base → core`.
 *
 * Without a plugged adapter the member is a no-op: a host that registers no
 * component never triggers that path.
 *
 * The anti-FOUC release is deliberately absent: a builder holds and releases its
 * own root inside `create()` (through `Stylesheets.holdUntilStyled`), so the
 * registry has nothing to write on the element it gets back.
 */
export interface iBuilderAdapter {
  /** Clears per-component identity counters so a rebuild starts from a clean slate. */
  resetCounters(): void;
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
