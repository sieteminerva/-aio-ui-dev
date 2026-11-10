import type { iMenuSplit } from "./Menu";
/**
 * Split one flat navigation list into three sections.
 *
 * The source data is linear (a header row plus links plus a CTA), so the split is a
 * convention rather than a structure:
 *
 * - the **first** entry is the brand,
 * - an entry whose `className` is `button`, or whose `href` is a `tel:` link, is an action,
 * - everything else is a navigation link.
 *
 * Exported and pure so the rule is testable without a DOM.
 */
export declare function splitMenuContent(content: any): iMenuSplit;
//# sourceMappingURL=Menu.engine.d.ts.map