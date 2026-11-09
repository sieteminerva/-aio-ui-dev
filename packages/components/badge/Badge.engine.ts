/**
 * Badge — engine.
 *
 * The one decision that is worth testing without a DOM: which input shapes this component
 * accepts. Every builder in this repo is called with whatever the data source produced, so
 * the accepted shapes live in ONE function instead of scattered `if`s.
 *
 * Not published: `index.ts` is the only entry, and it does not mention this file.
 */
import type { iBadgeItem } from "./Badge";

/**
 * Normalises anything the caller might hand over into `iBadgeItem[]`.
 *
 *   - `[...]`                      bare array of records
 *   - `{ items: [...] }`           named collection
 *   - `{ content: [...] }`         the registry's default unwrapping
 *   - `{ label, description }`     a single record
 *   - `{}` / `null` / `undefined`  nothing
 */
export function normalizePayload(data: any): iBadgeItem[] {
  if (!data) return [];

  if (Array.isArray(data)) return data.filter(Boolean);

  if (typeof data === "object") {
    if (Array.isArray(data.items)) return data.items.filter(Boolean);
    if (Array.isArray(data.content)) return data.content.filter(Boolean);
    if (data.label || data.description) return [data];
    if (data.content && typeof data.content === "object") return [data.content];
  }

  return [];
}
