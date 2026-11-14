import type { iBuilderConfig, iBuilderRegistry, iBuilderSelectorsConfig } from "@aio-ui/core/interface";
import { Builder } from "@aio-ui/base";
import type { iMarkdownMarkerConfig } from "./Markdown.engine";
/** The marker spelling is a parse concern, but a host types its config with it. */
export type { iMarkdownMarkerConfig } from "./Markdown.engine";
/**
 * Markdown — renders a Markdown source string as DOM.
 *
 * The parser (`./Markdown.engine.ts`) produces an AST and owns no DOM; this builder walks
 * it and renders keys, exactly like every other component. Fenced code reuses the
 * `code-block` markup (`figure > figcaption + pre > code`), and `Markdown.css` imports
 * `CodeBlock.css`, so there is one definition of what a code panel looks like.
 *
 * Nothing here is HTML-string based: text is written with `textContent` and text nodes, so
 * a document that contains `<script>` shows it instead of running it.
 */
/** Every node this component can render. */
export declare const ELEMENT_KEYS: readonly ["@markdown", "@markdown>section", "@markdown>heading-1", "@markdown>heading-2", "@markdown>heading-3", "@markdown>heading-4", "@markdown>paragraph", "@markdown>fence", "@markdown>fence>label", "@markdown>fence>code", "@markdown>fence>code>source", "@markdown>unordered", "@markdown>unordered>item", "@markdown>ordered", "@markdown>ordered>item", "@markdown>table", "@markdown>table>row", "@markdown>table>row>head", "@markdown>table>row>cell", "@markdown>quote", "@markdown>quote>paragraph", "@markdown>rule", "@markdown>strong", "@markdown>emphasis", "@markdown>inline-code", "@markdown>link"];
export type MarkdownElementType = (typeof ELEMENT_KEYS)[number];
/** Default shape per key. The root is a real `article`; headings clamp at `h4`. */
export declare const DEFAULT_SELECTORS: iBuilderSelectorsConfig<MarkdownElementType>;
/**
 * Which parts of a document to render, in what order.
 *
 * Absent → the whole document, unchanged from a builder that never heard of outlines. A path
 * that resolves to nothing is skipped: the document is the source of truth, and a page that
 * needs the section to exist asserts it in a test instead of throwing at runtime.
 */
export interface iMarkdownOutline {
    /** `@title`, `@lead`, `#anchor`, `role:name`, `H2`, or `H2 > H3` — see the README. */
    parts: string[];
    /** Wrap every part in `@markdown>section`. Default `false`. */
    section?: boolean;
    /** Render the heading that introduced a part. Default `"keep"`. */
    heading?: "keep" | "drop";
}
/** Component options. */
export interface iMarkdownConfig extends iBuilderConfig<MarkdownElementType> {
    /** How the document spells its part markers. Default: `part`, comment form. */
    marker?: iMarkdownMarkerConfig | null;
    /** Which parts to render. Default `null` — the whole document. */
    outline?: iMarkdownOutline | null;
}
/** Normalised payload. */
export interface iMarkdownPayload {
    source: string;
    /** Per-instance override of `config.outline`. */
    outline: iMarkdownOutline | null;
    /** Per-instance override of `config.marker`. */
    marker: iMarkdownMarkerConfig | null;
}
/**
 * Payload normalizer: `{ source }`, a bare string, or `{ source, outline, marker }`.
 * Anything else renders nothing, because guessing at a document shape would print the wrong
 * thing with confidence.
 */
export declare function normalizePayload(data: any): iMarkdownPayload;
export declare class MarkdownBuilder extends Builder<MarkdownElementType, iMarkdownConfig> {
    readonly builderId: keyof iBuilderRegistry;
    readonly name: keyof iBuilderRegistry;
    readonly stylesheet: string;
    config: Required<iMarkdownConfig>;
    /**
     * 🪶 LOADING MOCKUP — heading, paragraph, subheading, paragraph, fence, closing line:
     * the document rhythm, drawn with the mandatory `@aio-ui/skeleton` primitive. The real
     * block order is the payload's business and never read here.
     */
    protected loading(): HTMLElement;
    constructor(config?: Partial<iMarkdownConfig>);
    /**
     * Parse the source, then render every block — or only the parts an outline names.
     *
     * The outline is answered from the same parse: selection happens on the AST, so a part is
     * never rebuilt as Markdown text and parsed a second time.
     */
    prepare(data: any): HTMLElement;
    /** Render the outline's parts in declaration order, each optionally wrapped. */
    private appendParts;
    /**
     * Hydration valve. Only the leaf payloads are written here; structure is built in
     * `prepare()` because a document nests arbitrary runs of inline content.
     */
    protected template(typeKey: MarkdownElementType, el: HTMLElement, payload?: any): void;
    /**
     * Interaction wiring. A rendered document is inert by design: links are links, and the
     * caller decides whether to intercept them.
     */
    initialize(): void;
    /** One block → its key. Unknown kinds are skipped, never guessed at. */
    private appendBlock;
    /**
     * Inline runs. A text node is the safe primitive — `innerHTML` is never used in this
     * package, which is why source that contains markup is displayed instead of parsed.
     */
    private appendInline;
}
//# sourceMappingURL=Markdown.d.ts.map