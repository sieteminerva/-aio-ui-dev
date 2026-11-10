/**
 * Section — kit.
 *
 * key list, element-type union, default selectors.
 *
 * Not published: `index.ts` is the only entry and does not mention this file.
 */
import type { iBuilderSelectorsConfig } from "@aio-ui/core/interface";
export declare const ELEMENT_KEYS: readonly ["@section", "@section>content", "@section>content>image", "@section>content>eyebrow", "@section>content>header", "@section>content>desc", "@section>content>actions", "@section>content>actions>item"];
export type SectionElementType = (typeof ELEMENT_KEYS)[number];
export declare const DEFAULT_SELECTORS: iBuilderSelectorsConfig<SectionElementType>;
//# sourceMappingURL=Section.kit.d.ts.map