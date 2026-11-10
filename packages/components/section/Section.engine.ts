/**
 * Section — engine.
 *
 * `normalizeColumns` — column/block flattening.
 *
 * Not published: `index.ts` is the only entry and does not mention this file.
 */
import type { iSectionBlock, iSectionColumn } from "./Section";

export interface iNormalizedColumn {
  className?: string;
  blocks: iSectionBlock[];
  /** A pre-built node passed as `column.content`. */
  element?: HTMLElement;
}


/**
 * Normalize the payload into columns of blocks.
 *
 * Accepts `{ content: [...] }`, a bare array, or a single column object. A column whose
 * own fields look like a block is treated as one block, which is what makes the flat
 * shape work without a nested array of one.
 */
export function normalizeColumns(data: any): iNormalizedColumn[] {
  const content = data?.content ?? data;
  if (!content) return [];

  // `{}` is "nothing", not "one empty column".
  if (!Array.isArray(content) && typeof content === "object" && Object.keys(content).length === 0) return [];

  const raw = Array.isArray(content) ? content : [content];

  return raw.filter(Boolean).map((column: iSectionColumn) => {
    const className = typeof column.className === "string" ? column.className : undefined;
    const inner = column.content;

    if (Array.isArray(inner)) {
      return { className, blocks: inner.filter(Boolean) as iSectionBlock[] };
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
