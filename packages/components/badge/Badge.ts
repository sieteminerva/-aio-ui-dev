import type { iBuilderConfig, iBuilderRegistry, iBuilderSelectorsConfig } from "@aio-ui/core/interface";
import { Builder } from "@aio-ui/base/Base";

/**
 * Badge — component skeleton.
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
  "@badge",
  "@badge>item",
  "@badge>item>label",
  "@badge>item>desc",
] as const;

export type BadgeElementType = (typeof ELEMENT_KEYS)[number];

/**
 * Default shape per key. Themes and callers override this through `config.selectors`,
 * which is why it is exported: the contract is testable without a DOM.
 */
export const DEFAULT_SELECTORS: iBuilderSelectorsConfig<BadgeElementType> = {
  "@container": { tagName: "div", className: "badge-widget" },
  "@badge": { tagName: "div", className: "badge" },
  "@badge>item": { tagName: "div", className: "badge-item" },
  "@badge>item>label": { tagName: "span", className: "badge-label" },
  "@badge>item>desc": { tagName: "p", className: "badge-desc" },
};

/** One record this component knows how to render. Rename the fields to fit the data. */
export interface iBadgeItem {
  label?: string;
  description?: string;
}

/** Component options. Add only what a caller genuinely needs to change per instance. */
export interface iBadgeConfig extends iBuilderConfig<BadgeElementType> {
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
export function normalizePayload(data: any): iBadgeItem[] {
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

export class BadgeBuilder extends Builder<BadgeElementType, iBadgeConfig> {
  readonly builderId: keyof iBuilderRegistry = "badge";
  readonly name: keyof iBuilderRegistry = "badge";
  readonly stylesheet: string = "./Badge.css";
  public config: Required<iBadgeConfig>;

  constructor(config: Partial<iBadgeConfig> = {}) {
    super();

    const defaultConfig: Required<iBadgeConfig> = {
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
    const root = this.render("@badge", { count: items.length });

    for (const item of items) {
      const node = this.render("@badge>item", item);
      if (!node) continue;

      if (item.label) {
        const label = this.render("@badge>item>label", item);
        if (label) node.appendChild(label);
      }

      if (item.description) {
        const desc = this.render("@badge>item>desc", item);
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
  protected template(typeKey: BadgeElementType, el: HTMLElement, payload?: any): void {
    switch (typeKey) {
      case "@container":
        if (this.config.emphasis) el.classList.add("is-emphasis");
        break;

      case "@badge>item>label":
        el.textContent = payload?.label ?? "";
        break;

      case "@badge>item>desc":
        el.textContent = payload?.description ?? "";
        break;

      default:
        break;
    }
  }

  /**
   * Interaction wiring. Called once after the tree is attached; keep it idempotent
   * (stable listener refs + remove-before-add) so re-running it cannot stack handlers.
   * A purely visual component needs nothing here.
   */
  public initialize(): void { }
}
