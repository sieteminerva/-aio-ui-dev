/**
 * Normalize the payload into columns of blocks.
 *
 * Accepts `{ content: [...] }`, a bare array, or a single column object. A column whose
 * own fields look like a block is treated as one block, which is what makes the flat
 * shape work without a nested array of one.
 */
export function normalizeColumns(data) {
    const content = data?.content ?? data;
    if (!content)
        return [];
    // `{}` is "nothing", not "one empty column".
    if (!Array.isArray(content) && typeof content === "object" && Object.keys(content).length === 0)
        return [];
    const raw = Array.isArray(content) ? content : [content];
    return raw.filter(Boolean).map((column) => {
        const className = typeof column.className === "string" ? column.className : undefined;
        const inner = column.content;
        if (Array.isArray(inner)) {
            return { className, blocks: inner.filter(Boolean) };
        }
        if (typeof HTMLElement !== "undefined" && inner instanceof HTMLElement) {
            return { className, blocks: [], element: inner };
        }
        if (column.eyebrow || column.title || column.description || column.image || column.imageUrl || column.actions) {
            return { className, blocks: [column] };
        }
        return { className, blocks: [] };
    });
}
//# sourceMappingURL=Section.engine.js.map