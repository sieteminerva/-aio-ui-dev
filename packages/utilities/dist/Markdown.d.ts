/**
 * Markdown — a dependency-free subset parser.
 *
 * The repository documents itself in `.md` files (every package README, `docs/framework/*.md`),
 * so a page that shows documentation must be able to read one. This module turns Markdown
 * into a small **AST**, and nothing else: it never touches the DOM, never builds HTML, and
 * never escapes by string concatenation. The renderer (`@aio-ui/markdown`) walks the tree and
 * writes text with `textContent`, which is why a `<script>` in the source is printed, not run.
 *
 * The subset is exactly what this repo writes:
 *
 *   block      heading h1-h6, paragraph, fenced code, unordered/ordered list,
 *              GFM table, blockquote, horizontal rule
 *   inline     `code`, **bold**, *em* / _em_, [link](href)
 *
 * A `mermaid` fence is an ordinary fence here — highlighting is a renderer's business.
 */
/** A run of plain text. */
export interface iMarkdownText {
    type: "text";
    value: string;
}
/** An inline code span: `` `value` ``. */
export interface iMarkdownCodeSpan {
    type: "code";
    value: string;
}
export interface iMarkdownStrong {
    type: "strong";
    content: iMarkdownInline[];
}
export interface iMarkdownEmphasis {
    type: "emphasis";
    content: iMarkdownInline[];
}
export interface iMarkdownLink {
    type: "link";
    href: string;
    content: iMarkdownInline[];
}
export type iMarkdownInline = iMarkdownText | iMarkdownCodeSpan | iMarkdownStrong | iMarkdownEmphasis | iMarkdownLink;
export interface iMarkdownHeading {
    type: "heading";
    /** 1-6; a renderer may clamp, the parser does not. */
    level: number;
    content: iMarkdownInline[];
}
export interface iMarkdownParagraph {
    type: "paragraph";
    content: iMarkdownInline[];
}
export interface iMarkdownFence {
    type: "fence";
    /** Everything after the opening backticks, e.g. `ts`. Empty when unlabelled. */
    language: string;
    code: string;
}
export interface iMarkdownList {
    type: "list";
    ordered: boolean;
    /** One entry per item; an item's inner blocks are flattened to inline content. */
    items: iMarkdownInline[][];
}
export interface iMarkdownTable {
    type: "table";
    head: iMarkdownInline[][];
    rows: iMarkdownInline[][][];
}
export interface iMarkdownQuote {
    type: "quote";
    blocks: iMarkdownBlock[];
}
export interface iMarkdownRule {
    type: "rule";
}
export type iMarkdownBlock = iMarkdownHeading | iMarkdownParagraph | iMarkdownFence | iMarkdownList | iMarkdownTable | iMarkdownQuote | iMarkdownRule;
/**
 * Split one table row on pipes that are NOT inside a code span.
 *
 * `` `a | b` `` is one cell: splitting naively would cut an inline code span in half, which
 * is the exact bug the fixtures pin down.
 */
export declare function splitTableRow(line: string): string[];
/**
 * Inline parser.
 *
 * One pass, left to right, longest-marker-first so `**bold**` is not read as two `*em*`.
 * Unclosed markers are literal text — a document is not required to be well formed here.
 */
export declare function parseInline(source: string): iMarkdownInline[];
/**
 * Block parser.
 *
 * Line based on purpose: the documents this reads are written by hand and edited line by
 * line, so a line-oriented pass keeps every construct local and debuggable.
 */
export declare function parseMarkdown(source: string): iMarkdownBlock[];
//# sourceMappingURL=Markdown.d.ts.map