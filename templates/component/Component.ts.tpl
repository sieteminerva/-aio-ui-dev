import type { iBuilderConfig, iBuilderRegistry, iBuilderSelectorsConfig } from "@aio-ui/core/interface";
import { Builder } from "@aio-ui/base/Base";

/**
 * __TITLE__ — component skeleton.
 *
 * The contract of a component file, in the order it appears below:
 *
 *   1. `ELEMENT_KEYS`      every node this component renders. A key IS the selector token.
 *   2. `DEFAULT_SELECTORS` tag + class per key — the shape of the rendered output.
 *   3. `normalizePayload`  the single place that decides which input shapes are accepted.
 *   4. `prepare()`         builds the tree with `render()`, never `document.createElement`.
 *   5. `template()`        hydrates text/attributes per key, never HTML strings.
 *   6. `initialize()`      optional wiring; must be safe to call more than once.
 *
 * Anything DOM-related that is not expressed as a key is invisible to theming: a theme
 * template can only restyle keys it can name, so keep the key list honest.
 */

/** Every node this component can render. Order is documentation, not behaviour. */
export const ELEMENT_KEYS = [
  "@container",
  "@__CAMEL__",
  "@__CAMEL__>item",
  "@__CAMEL__>item>label",
  "@__CAMEL__>item>desc",
] as const;

export type __PASCAL__ElementType = (typeof ELEMENT_KEYS)[number];

/**
 * Default shape per key. Themes and callers override this through `config.selectors`,
 * which is why it is exported: the contract is testable without a DOM.
 */
export const DEFAULT_SELECTORS: iBuilderSelectorsConfig<__PASCAL__ElementType> = {
  "@container": { tagName: "div", className: "__KEBAB__-widget" },
  "@__CAMEL__": { tagName: "div", className: "__KEBAB__" },
  "@__CAMEL__>item": { tagName: "div", className: "__KEBAB__-item" },
  "@__CAMEL__>item>label": { tagName: "span", className: "__KEBAB__-label" },
  "@__CAMEL__>item>desc": { tagName: "p", className: "__KEBAB__-desc" },
};

/** One record this component knows how to render. Rename the fields to fit the data. */
export interface i__PASCAL__Item {
  label?: string;
  description?: string;
}

/** Component options. Add only what a caller genuinely needs to change per instance. */
export interface i__PASCAL__Config extends iBuilderConfig<__PASCAL__ElementType> {
  /** Example flag — replace with real options or delete. */
  emphasis?: boolean;
}

/**
 * Payload normalizer.
 *
 * Every component in this repo is called with whatever the data source produced, so the
 * accepted shapes are declared in ONE function instead of scattered `if`s:
 *
 *   - `[...]`                      bare array of records
 *   - `{ items: [...] }`           named collection
 *   - `{ content: [...] }`         the registry's default unwrapping
 *   - `{ label, description }`     a single record
 *   - `{}` / `null` / `undefined`  nothing
 */
export function normalizePayload(data: any): i__PASCAL__Item[] {
  if (!data) return [];

  if (Array.isArray(data)) return data.filter(Boolean);

  if (typeof data === "object") {
    if (Array.isArray(data.items)) return data.items.filter(Boolean);
    if (Array.isArray(data.content)) return data.content.filter(Boolean);
    if (data.label || data.description) return [data];
    if (data.content && typeof data.content === "object") return [data.content];
  }

  return [];
}

export class __PASCAL__Builder extends Builder<__PASCAL__ElementType, i__PASCAL__Config> {
  readonly builderId: keyof iBuilderRegistry = "__KEBAB__";
  readonly name: keyof iBuilderRegistry = "__KEBAB__";
  readonly stylesheet: string = "./__PASCAL__.css";
  public config: Required<i__PASCAL__Config>;

  constructor(config: Partial<i__PASCAL__Config> = {}) {
    super();

    const defaultConfig: Required<i__PASCAL__Config> = {
      themeId: "default",
      namespace: null,
      emit: () => { },
      selectors: DEFAULT_SELECTORS,
      emphasis: false,
    };

    this.config = this.resolveConfig(defaultConfig, config);
  }

  /**
   * Build the tree. `render()` registers the node under its key, calls `template()`,
   * and returns the element. Append children explicitly — order is yours to decide, and
   * optional parts should simply not be appended instead of being appended empty.
   */
  public prepare(data: any): HTMLElement {
    const items = normalizePayload(data);

    const container = this.render("@container", { count: items.length });
    const root = this.render("@__CAMEL__", { count: items.length });

    for (const item of items) {
      const node = this.render("@__CAMEL__>item", item);
      if (!node) continue;

      if (item.label) {
        const label = this.render("@__CAMEL__>item>label", item);
        if (label) node.appendChild(label);
      }

      if (item.description) {
        const desc = this.render("@__CAMEL__>item>desc", item);
        if (desc) node.appendChild(desc);
      }

      root?.appendChild(node);
    }

    if (container && root) container.appendChild(root);

    return this.load("@container") as HTMLElement;
  }

  /**
   * Hydration valve. Text and attributes only — `textContent`, never `innerHTML`,
   * so content can never inject markup.
   */
  protected template(typeKey: __PASCAL__ElementType, el: HTMLElement, payload?: any): void {
    switch (typeKey) {
      case "@container":
        if (this.config.emphasis) el.classList.add("is-emphasis");
        break;

      case "@__CAMEL__>item>label":
        el.textContent = payload?.label ?? "";
        break;

      case "@__CAMEL__>item>desc":
        el.textContent = payload?.description ?? "";
        break;

      default:
        break;
    }
  }

  /**
   * Interaction wiring.
   *
   * `create()` calls `initialize(rootElement, content)` once after the tree is attached.
   * Keep it idempotent — stable listener refs and remove-before-add — so re-running it
   * (standalone bootstrapping, re-mount) cannot stack handlers. Timers, observers and
   * abort controllers started here must be released in `destroy()`. A purely visual
   * component needs nothing here.
   */
  public initialize(): void { }
}
