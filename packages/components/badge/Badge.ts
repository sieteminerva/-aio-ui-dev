import type { iBuilderConfig, iBuilderRegistry } from "@aio-ui/core/interface";
import { Builder } from "@aio-ui/base";
import { Skeleton } from "@aio-ui/skeleton";
import { DEFAULT_SELECTORS } from "./Badge.kit";
import type { BadgeElementType } from "./Badge.kit";
import { normalizePayload } from "./Badge.engine";

/**
 * Badge — builder.
 *
 * This file is the *whole* builder and nothing else. The parts it needs live next door and
 * are named after their duty:
 *
 *   - `Badge.kit.ts`     key list, element-type union, default selectors.
 *   - `Badge.engine.ts`  `normalizePayload` — the accepted input shapes.
 *
 * The contract of the builder itself, in order:
 *
 *   1. `prepare()`     builds the tree with `render()`, never `document.createElement`.
 *   2. `template()`    hydrates text/attributes per key, never HTML strings.
 *   3. `initialize()`  optional wiring; must be safe to call more than once.
 *
 * Anything DOM-related that is not expressed as a key is invisible to theming: a theme
 * template can only restyle keys it can name, so keep the key list honest.
 */

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

export class BadgeBuilder extends Builder<BadgeElementType, iBadgeConfig> {
  readonly builderId: keyof iBuilderRegistry = "badge";
  readonly name: keyof iBuilderRegistry = "badge";
  readonly stylesheet: string = "./Badge.css";
  public config: Required<iBadgeConfig>;

  /**
   * 🪶 LOADING MOCKUP — three pill labels in a row, drawn with the mandatory
   * `@aio-ui/skeleton` primitive. A badge is inline, so the mockup is a row of short
   * bones rather than a full-width bar.
   */
  protected loading(): HTMLElement {
    return Skeleton.create({
      shape: "row",
      gap: "0.5rem",
      children: [{ shape: "bone", width: "5rem", height: "1.5rem", count: 3 }],
    });
  }

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
