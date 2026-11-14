import type { iBuilderConfig, iBuilderRegistry } from "@aio-ui/core/interface";
import { Builder } from "@aio-ui/base";
import type { BadgeElementType } from "./Badge.kit";
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
export declare class BadgeBuilder extends Builder<BadgeElementType, iBadgeConfig> {
    readonly builderId: keyof iBuilderRegistry;
    readonly name: keyof iBuilderRegistry;
    readonly stylesheet: string;
    config: Required<iBadgeConfig>;
    /**
     * 🪶 LOADING MOCKUP — three pill labels in a row, drawn with the mandatory
     * `@aio-ui/skeleton` primitive. A badge is inline, so the mockup is a row of short
     * bones rather than a full-width bar.
     */
    protected loading(): HTMLElement;
    constructor(config?: Partial<iBadgeConfig>);
    /**
     * Build the tree. `render()` registers the node under its key, calls `template()`,
     * and returns the element. Append children explicitly — order is yours to decide, and
     * optional parts should simply not be appended instead of being appended empty.
     */
    prepare(data: any): HTMLElement;
    /**
     * Hydration valve. Text and attributes only — `textContent`, never `innerHTML`,
     * so content can never inject markup.
     */
    protected template(typeKey: BadgeElementType, el: HTMLElement, payload?: any): void;
    /**
     * Interaction wiring. Called once after the tree is attached; keep it idempotent
     * (stable listener refs + remove-before-add) so re-running it cannot stack handlers.
     * A purely visual component needs nothing here.
     */
    initialize(): void;
}
//# sourceMappingURL=Badge.d.ts.map