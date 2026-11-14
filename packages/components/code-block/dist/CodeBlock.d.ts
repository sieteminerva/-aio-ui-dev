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
export declare const ELEMENT_KEYS: readonly ["@container", "@container>figure", "@container>figure>label", "@container>figure>block", "@container>figure>block>source", "@container>figure>actions", "@container>figure>actions>copy", "@container>figure>actions>edit", "@container>figure>actions>save", "@container>figure>actions>custom"];
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
/** What an action button can do. `custom` only runs its own `onClick`. */
export type iCodeBlockActionType = "copy" | "edit" | "save" | "custom";
/**
 * Handed to `onClick` — same vocabulary as `iInputActionContext`, so a caller that already
 * writes input actions reads the same fields here.
 */
export interface iCodeBlockActionContext {
    /** The button's own type. */
    action: iCodeBlockActionType;
    /** Element the action acts on: the `<code>` panel, or `null` if the figure is gone. */
    element: HTMLElement | null;
    /** The `<figure>` that owns the panel. */
    parentElement: HTMLElement;
    /** Panel text: the current source, or the committed text after a `save`. */
    value: string;
    /** Caption of the panel, when it has one. */
    label?: string;
    /** `data-language` of the panel, when it was set. */
    language?: string;
    /** Position of the panel inside its container, `0`-based. */
    index: number;
    button: HTMLButtonElement;
    event: MouseEvent;
    /** Free slot for whatever the handler produced. */
    result?: unknown;
}
/** Emitter for an action: the callback in the config IS the event sink. */
export type iCodeBlockActionHandler = (parentElement: HTMLElement, context: iCodeBlockActionContext) => void | Promise<void>;
/**
 * One button printed under the panel.
 *
 * `copy` / `edit` / `save` are wired here and need nothing from the caller; `custom` is a
 * plain button whose only behaviour is `onClick`. Editable mode is a `contentEditable`
 * attribute on the `<code>` element (the same mechanism `Table` uses per cell), so the
 * panel becomes its own editor instead of a swapped-in `<textarea>`.
 */
export interface iCodeBlockAction {
    type: iCodeBlockActionType;
    /** Button text. Defaults to the capitalised type (`Copy`, `Edit`, `Save`, `Run`). */
    label?: string;
    onClick: iCodeBlockActionHandler;
}
/** Default button text per action type. */
export declare const ACTION_LABELS: Record<iCodeBlockActionType, string>;
/** Component options. Add only what a caller genuinely needs to change per instance. */
export interface iCodeBlockConfig extends iBuilderConfig<CodeBlockElementType> {
    /** Buttons under every panel. Empty (the default) keeps the block read-only. */
    actions?: iCodeBlockAction[];
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
    #private;
    readonly builderId: keyof iBuilderRegistry;
    readonly name: keyof iBuilderRegistry;
    readonly stylesheet: string;
    config: Required<iCodeBlockConfig>;
    /**
     * 🪶 LOADING MOCKUP — the frame's own anatomy (label, paper, action row), drawn with the
     * mandatory `@aio-ui/skeleton` primitive. The line count is the payload's business; the
     * mockup only reserves the box the sheet will take over.
     */
    protected loading(): HTMLElement;
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
     * Wire the action buttons — one listener per button, resolved against `config.actions`.
     *
     * `edit` / `save` only flip the `contentEditable` attribute on the panel's `<code>`; the
     * committed text goes back through `textContent`, so nothing is ever parsed as HTML.
     * Reporting is the caller's: the action's own `onClick` is the sink, exactly like an
     * input field's action set — there is no separate event name to learn.
     */
    initialize(el?: HTMLElement): void;
}
//# sourceMappingURL=CodeBlock.d.ts.map