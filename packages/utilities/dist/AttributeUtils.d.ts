/**
 * 🧱 ATTRIBUTE UTILS — shared element-attribute stamping helpers.
 *
 * Extracted from the three places that duplicated the same logic:
 * • `Builder._applyNodeAttributes` (Base.ts)
 * • `DOMRenderer.attributeProcessor` (DOMRenderer.ts)
 * • `Input.applyAttributes` (Form/Input.ts)
 *
 * Two canonical shapes of declared attributes are supported everywhere:
 * 1. Dictionary (`attrs: { name: value, ... }`) — plain setAttribute.
 * 2. Array (`attributes: [{ name, value }, ...]`) — with the event-handler
 *    special case: a `function` value on an `on*` attribute is assigned as
 *    an element property (`el.onclick = fn`), not serialized via setAttribute.
 */
/** One declared attribute pair, e.g. `{ name: "onclick", value: fn }`. */
export interface iAttributeSpec {
    name: string;
    value: unknown;
}
/**
 * 🧩 APPLY ATTR DICTIONARY — stamp every `[name]: value` pair via setAttribute.
 * Values are stringified; `null`/`undefined` are skipped. Safe to call with
 * a missing dictionary (no-op).
 */
export declare function applyAttrDictionary(el: HTMLElement, attrs?: Record<string, unknown> | null): void;
/**
 * 🧩 APPLY ATTRIBUTE LIST — stamp every `{ name, value }` pair.
 * Event-handler convention: `function` value + `on*` name → assigned as an
 * element property (live handler reference); anything else → setAttribute.
 */
export declare function applyAttributeList(el: HTMLElement, attributes?: iAttributeSpec[] | null): void;
//# sourceMappingURL=AttributeUtils.d.ts.map