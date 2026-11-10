let builderAdapter = null;
/**
 * @summary Plug an implementation into the builder port.
 * @param adapter - The adapter to use, or `null` to detach it again.
 */
export function setBuilderAdapter(adapter) {
    builderAdapter = adapter;
}
/**
 * @summary Read the currently plugged adapter.
 * @returns The active adapter, or `null` when no builder package has loaded yet.
 */
export function getBuilderAdapter() {
    return builderAdapter;
}
//# sourceMappingURL=BuilderPort.js.map