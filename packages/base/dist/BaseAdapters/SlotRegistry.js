export class SlotRegistry {
    /** slot key → child element that was attached through this registry. */
    #slots = new Map();
    #resolveHolder;
    constructor(resolveHolder) {
        this.#resolveHolder = resolveHolder;
    }
    /**
     * 📎 ATTACH — weld `child` into the holder resolved for `slotKey` and record
     * it for later `detach()`. The child is registered even when no holder
     * exists yet, so a later detach still cleans it up.
     */
    attach(slotKey, child) {
        if (!child)
            return;
        const holder = this.#resolveHolder(slotKey);
        if (holder)
            holder.appendChild(child);
        this.#slots.set(slotKey, child);
    }
    /** 🧷 DETACH — remove the child recorded for `slotKey` from its DOM parent. */
    detach(slotKey) {
        const child = this.#slots.get(slotKey);
        if (child && child.parentNode)
            child.parentNode.removeChild(child);
        this.#slots.delete(slotKey);
    }
    /** The child currently attached to `slotKey`, if any. */
    get(slotKey) {
        return this.#slots.get(slotKey) ?? null;
    }
    has(slotKey) {
        return this.#slots.has(slotKey);
    }
    /** Release every recorded slot reference (used by builder `destroy()`). */
    clear() {
        this.#slots.clear();
    }
}
//# sourceMappingURL=SlotRegistry.js.map