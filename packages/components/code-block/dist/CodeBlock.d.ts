import type { iBuilderConfig, iBuilderRegistry, iBuilderSelectorsConfig } from "@aio-ui/core/interface";
import { Builder } from "@aio-ui/base";
/**
 * Code Block — one or more dark "paper" panels holding source text.
 *
 * Why it is a component: every docs surface in this repo (kitchen panels, the demo's
 * Getting Started and Modules pages, every README preview) needs the same block, and it
 * was being hand-rolled as `<pre class="snippet">` with its look living in demo CSS.
 *
 * The contract of a component file, in the order it appears below:
 *
 *   1. `ELEMENT_KEYS`      every node this component renders. A key IS the selector token.
 *   2. `DEFAULT_SELECTORS` tag + class per key — the shape of the rendered output.
 *   3. `normalizePayload`  the single place that decides which input shapes are accepted.
 *   4. `prepare()`         builds the tree with `render()`, never `document.createElement`.
 *   5. `template()`        hydrates text/attributes per key, never HTML strings.
 *
 * The source text is written with `textContent`, so a snippet containing markup is shown,
 * never executed.
 */
/** Every node this component can render. Order is documentation, not behaviour. */
export declare const ELEMENT_KEYS: readonly ["@container", "@container>figure", "@container>figure>label", "@container>figure>block", "@container>figure>block>source"];
export type CodeBlockElementType = (typeof ELEMENT_KEYS)[number];
/**
 * Default shape per key. The root is a real `section` (it is a block of source text, and it
 * holds one or more panels); the panel itself is a real `pre`, so a caller that only knows
 * "this is code" still gets a correct element even when it overrides the wrapper.
 */
export declare const DEFAULT_SELECTORS: iBuilderSelectorsConfig<CodeBlockElementType>;
/** One panel of source text. `label` prints above it, `language` is a styling hook. */
export interface iCodeBlockEntry {
    code: string;
    /** Caption above the panel, e.g. `ts · register`. */
    label?: string;
    /** Written to `data-language`; this sheet does not highlight, a highlighter can. */
    language?: string;
}
/** Component options. Add only what a caller genuinely needs to change per instance. */
export interface iCodeBlockConfig extends iBuilderConfig<CodeBlockElementType> {
}
/**
 * Payload normalizer.
 *
 * Accepted shapes:
 *
 *   - `{ code, label?, language? }`   one block
 *   - `{ blocks: [...] }`             several labelled blocks in one call
 *   - `[...]`                         bare array of the same records
 *   - `"…"`                           source only, no label
 *   - `{ content: … }`                the registry's default unwrapping
 *   - `{}` / `null` / `undefined`     nothing
 */
export declare function normalizePayload(data: any): iCodeBlockEntry[];
export declare class CodeBlockBuilder extends Builder<CodeBlockElementType, iCodeBlockConfig> {
    readonly builderId: keyof iBuilderRegistry;
    readonly name: keyof iBuilderRegistry;
    readonly stylesheet: string;
    config: Required<iCodeBlockConfig>;
    constructor(config?: Partial<iCodeBlockConfig>);
    /**
     * Build the tree: one `figure` per entry (label above, `pre > code` below), and one
     * stack that holds them all. A block without a label simply has no caption node.
     */
    prepare(data: any): HTMLElement;
    /**
     * Hydration valve. Text and attributes only — `textContent`, never `innerHTML`, so
     * source that happens to contain markup is printed instead of parsed.
     */
    protected template(typeKey: CodeBlockElementType, el: HTMLElement, payload?: any): void;
    /**
     * Interaction wiring. A code block is purely visual, so nothing here is needed; the
     * hook stays explicit so a later highlighter has one obvious place to start.
     */
    initialize(): void;
}
//# sourceMappingURL=CodeBlock.d.ts.map