/**
 * 🧩 SLOT REGISTRY — attach/detach slotting, extracted from `Builder`.
 *
 * A slot is a named container key (e.g. "@article>list") registered in the
 * builder's node store. `attach()` welds a child element into the resolved
 * holder element and records it; `detach()` removes the recorded child from
 * the DOM and forgets it.
 *
 * The registry does not own the node store — it resolves holders through the
 * `resolveHolder` callback supplied by the owning builder, so the slotting
 * concern stays decoupled from the storage shape.
 */
export type SlotHolderResolver = (slotKey: string) => HTMLElement | null | undefined;
export declare class SlotRegistry {
    #private;
    constructor(resolveHolder: SlotHolderResolver);
    /**
     * 📎 ATTACH — weld `child` into the holder resolved for `slotKey` and record
     * it for later `detach()`. The child is registered even when no holder
     * exists yet, so a later detach still cleans it up.
     */
    attach(slotKey: string, child: HTMLElement | null | undefined): void;
    /** 🧷 DETACH — remove the child recorded for `slotKey` from its DOM parent. */
    detach(slotKey: string): void;
    /** The child currently attached to `slotKey`, if any. */
    get(slotKey: string): HTMLElement | null;
    has(slotKey: string): boolean;
    /** Release every recorded slot reference (used by builder `destroy()`). */
    clear(): void;
}
//# sourceMappingURL=SlotRegistry.d.ts.map