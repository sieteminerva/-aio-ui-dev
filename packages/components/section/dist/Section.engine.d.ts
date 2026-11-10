/**
 * Section — engine.
 *
 * `normalizeColumns` — column/block flattening.
 *
 * Not published: `index.ts` is the only entry and does not mention this file.
 */
import type { iSectionBlock } from "./Section";
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
export declare function normalizeColumns(data: any): iNormalizedColumn[];
//# sourceMappingURL=Section.engine.d.ts.map