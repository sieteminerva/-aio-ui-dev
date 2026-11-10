/**
 * Section — kit.
 *
 * key list, element-type union, default selectors.
 *
 * Not published: `index.ts` is the only entry and does not mention this file.
 */
import type { iBuilderSelectorsConfig } from "@aio-ui/core/interface";


export const ELEMENT_KEYS = [
  "@section",
  "@section>content",
  "@section>content>image",
  "@section>content>eyebrow",
  "@section>content>header",
  "@section>content>desc",
  "@section>content>actions",
  "@section>content>actions>item",
] as const;


export type SectionElementType = (typeof ELEMENT_KEYS)[number];


export const DEFAULT_SELECTORS: iBuilderSelectorsConfig<SectionElementType> = {
  "@section": { tagName: "section", className: "section" },
  "@section>content": { tagName: "div", className: "section-column" },
  "@section>content>image": { tagName: "img", className: "section-image" },
  "@section>content>eyebrow": { tagName: "div", className: "section-eyebrow" },
  "@section>content>header": { tagName: "h2", className: "section-title" },
  "@section>content>desc": { tagName: "p", className: "section-desc" },
  "@section>content>actions": { tagName: "div", className: "section-actions" },
  // An anchor: a CTA is usually a link. Without `href` it becomes a real button via
  // role="button" + tabindex, so both cases stay keyboard reachable.
  "@section>content>actions>item": { tagName: "a", className: "section-cta" },
};
