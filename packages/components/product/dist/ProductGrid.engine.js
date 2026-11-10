/**
 * ProductGrid — engine.
 *
 * `normalizeProducts` — collection shape.
 *
 * Not published: `index.ts` is the only entry and does not mention this file.
 */
/** `{ content: { data: [...] } }`, `{ content: [...] }`, `[...]`, `{ data: [...] }`. */
export function normalizeProducts(data) {
    const content = data?.content ?? data;
    if (Array.isArray(content))
        return content.filter(Boolean);
    if (Array.isArray(content?.data))
        return content.data.filter(Boolean);
    if (Array.isArray(data?.data))
        return data.data.filter(Boolean);
    return [];
}
//# sourceMappingURL=ProductGrid.engine.js.map