import type { iBuilderConfig, iBuilderRegistry, iBuilderSelectorsConfig } from "@aio-ui/core/interface";
import { Builder } from "@aio-ui/base";
/**
 * Markdown — renders a Markdown source string as DOM.
 *
 * The parser lives in `@aio-ui/utilities/Markdown` and produces an AST; this builder walks
 * it and renders keys, exactly like every other component. Fenced code reuses the
 * `code-block` markup (`figure > figcaption + pre > code`), and `Markdown.css` imports
 * `CodeBlock.css`, so there is one definition of what a code panel looks like.
 *
 * Nothing here is HTML-string based: text is written with `textContent` and text nodes, so
 * a document that contains `<script>` shows it instead of running it.
 */
/** Every node this component can render. */
export declare const ELEMENT_KEYS: readonly ["@markdown", "@markdown>heading-1", "@markdown>heading-2", "@markdown>heading-3", "@markdown>heading-4", "@markdown>paragraph", "@markdown>fence", "@markdown>fence>label", "@markdown>fence>code", "@markdown>fence>code>source", "@markdown>unordered", "@markdown>unordered>item", "@markdown>ordered", "@markdown>ordered>item", "@markdown>table", "@markdown>table>row", "@markdown>table>row>head", "@markdown>table>row>cell", "@markdown>quote", "@markdown>quote>paragraph", "@markdown>rule", "@markdown>strong", "@markdown>emphasis", "@markdown>inline-code", "@markdown>link"];
export type MarkdownElementType = (typeof ELEMENT_KEYS)[number];
/** Default shape per key. The root is a real `article`; headings clamp at `h4`. */
export declare const DEFAULT_SELECTORS: iBuilderSelectorsConfig<MarkdownElementType>;
/** Component options. A markdown document takes no per-instance styling options. */
export interface iMarkdownConfig extends iBuilderConfig<MarkdownElementType> {
}
/**
 * Payload normalizer: `{ source }` or a bare string. Everything else renders nothing,
 * because guessing at a document shape would print the wrong thing with confidence.
 */
export declare function normalizePayload(data: any): string;
export declare class MarkdownBuilder extends Builder<MarkdownElementType, iMarkdownConfig> {
    readonly builderId: keyof iBuilderRegistry;
    readonly name: keyof iBuilderRegistry;
    readonly stylesheet: string;
    config: Required<iMarkdownConfig>;
    constructor(config?: Partial<iMarkdownConfig>);
    /** Parse the source, then render one key per block. */
    prepare(data: any): HTMLElement;
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