/**
 * Markdown engine — parser, outline, and path selection.
 *
 * Lives beside its only consumer instead of in `@aio-ui/utilities`: the builder
 * (`./Markdown.ts`) is the one thing in the repo that reads a document, so publishing a
 * parser subpath would have been surface with no second caller.
 *
 * The repository documents itself in `.md` files (every package README, `docs/framework/*.md`),
 * so a page that shows documentation must be able to read one. This module turns Markdown
 * into a small **AST**, and nothing else: it never touches the DOM, never builds HTML, and
 * never escapes by string concatenation. The renderer (`./Markdown.ts`) walks the tree and
 * writes text with `textContent`, which is why a `<script>` in the source is printed, not run.
 *
 * The subset is exactly what this repo writes:
 *
 *   block      heading h1-h6, paragraph, fenced code, unordered/ordered list,
 *              GFM table, blockquote, horizontal rule
 *   inline     `code`, **bold**, *em* / _em_, [link](href)
 *   marker     `<!-- part: id=x role=y -->` — a line no renderer ever shows, read as a
 *              pointer that names the heading under it
 *
 * A `mermaid` fence is an ordinary fence here — highlighting is a renderer's business.
 *
 * Two things sit on top of the AST and are the reason the markers exist:
 *
 *   `outline()`        the document as a list of heading sections, each with the trail that
 *                      reaches it and whatever the marker declared
 *   `selectOutline()`  one path in, the blocks behind it out — `@lead`, `@title`, `#anchor`,
 *                      `role:name`, or a heading path (`Supported syntax > Cascade`)
 *
 * The parser understands *syntax*, never *meaning*: `role=usage` is a word it hands back, not
 * a concept it interprets. That keeps every convention in the document, not in this file.
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
    /** What the line above this heading declared, when it declared anything. */
    marker?: iMarkdownPartMarker;
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
 * What a marker line carries.
 *
 * Keys are free-form `key=value` pairs so a document can declare more than the two this
 * repo uses today without a parser change (`order=2`, `tier=api`, …).
 */
export interface iMarkdownPartMarker {
    /** Declared anchor. Overrides the slug the heading text would produce. */
    id?: string;
    /** Declared role. The parser never interprets it; a selector can match it. */
    role?: string;
    /** Any other declared pair, kept verbatim. */
    [key: string]: string | undefined;
}
/**
 * Invisible line shapes that can carry a marker.
 *
 *   comment  `<!-- part: id=x -->`      hidden by every Markdown renderer
 *   link     `[part:id=x]: #`           a reference definition nobody references, also hidden
 */
export type iMarkdownMarkerForm = "comment" | "link";
/** How a document spells its markers. */
export interface iMarkdownMarkerConfig {
    /** Word that opens a marker. Default `"part"`. */
    keyword?: string;
    /** Shapes to read, tried in order. Default `["comment"]`. */
    forms?: iMarkdownMarkerForm[];
}
/** Parse options. */
export interface iMarkdownParseOptions {
    /** Marker spelling. `null` keeps the default, never disables markers. */
    marker?: iMarkdownMarkerConfig | null;
}
/** One heading and the blocks under it, in `outline()` order. */
export interface iMarkdownSection {
    /** Heading level that opened this section. */
    level: number;
    /** Heading text, markup flattened — markers are never part of it. */
    heading: string;
    /** Anchor: declared `id=`, else a slug of the heading. Unique within the document. */
    id: string;
    /** Declared `role=`, or `null`. */
    role: string | null;
    /** The whole marker, or `null` when the heading had none. */
    marker: iMarkdownPartMarker | null;
    /** Heading texts from the document root down to this heading, itself included. */
    trail: string[];
    /** The heading block itself, so a renderer can keep or drop it. */
    headingBlock: iMarkdownHeading;
    /** Blocks after the heading, up to the next heading of any level. */
    blocks: iMarkdownBlock[];
}
/** A parsed document, sectioned. */
export interface iMarkdownDocument {
    /** The first H1, if the document has one. */
    title: iMarkdownHeading | null;
    /** Blocks between the H1 and the first section opener. */
    lead: iMarkdownBlock[];
    /** Sections in document order. */
    sections: iMarkdownSection[];
}
/** One resolved selection: what to render for a given path. */
export interface iMarkdownPick {
    /** Heading to render first, or `null` for `@lead`. */
    heading: iMarkdownHeading | null;
    /** Blocks behind the heading (`@title` puts the heading itself here). */
    blocks: iMarkdownBlock[];
}
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
 *
 * Marker lines are consumed here, not by a renderer: a marker that reached the AST as text
 * would print `<!-- part: id=x -->` in the middle of a page.
 */
export declare function parseMarkdown(source: string, options?: iMarkdownParseOptions): iMarkdownBlock[];
/** Inline content flattened to plain text — headings are matched as text, not as runs. */
export declare function inlineText(nodes: iMarkdownInline[]): string;
/** Heading text → anchor: `Supported syntax` → `supported-syntax`. */
export declare function slugify(text: string): string;
/**
 * Section a parsed document.
 *
 * A section owns the blocks between its heading and the next heading of **any** level, so an
 * H2 keeps its H3s: `Config` renders complete, while `Supported syntax > Cascade` renders one
 * block. The trail is what makes both resolvable without a hand-written index.
 */
export declare function outline(blocks: iMarkdownBlock[]): iMarkdownDocument;
/**
 * Resolve one path to the blocks behind it.
 *
 *   `@title`       the H1 block
 *   `@lead`        everything before the first section opener
 *   `#anchor`      the section that declared (or slugged to) that id, and its subsections
 *   `role:name`    every section declaring that role, in document order, with its subsections
 *   `A` / `A > B`  a heading trail, compared case-insensitively on text
 *
 * An unresolvable path returns `[]` — a template never guesses, and a caller that needs the
 * section to exist asserts it in a test.
 */
export declare function selectOutline(doc: iMarkdownDocument, path: string): iMarkdownPick[];
//# sourceMappingURL=Markdown.engine.d.ts.map