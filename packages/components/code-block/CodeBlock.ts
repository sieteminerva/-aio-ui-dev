import type { iBuilderConfig, iBuilderRegistry, iBuilderSelectorsConfig } from "@aio-ui/core/interface";
import { Builder } from "@aio-ui/base";
import { Skeleton } from "@aio-ui/skeleton";

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
export const ELEMENT_KEYS = [
  "@container",
  "@container>figure",
  "@container>figure>label",
  "@container>figure>block",
  "@container>figure>block>source",
  "@container>figure>actions",
  "@container>figure>actions>copy",
  "@container>figure>actions>edit",
  "@container>figure>actions>save",
  "@container>figure>actions>custom",
] as const;

export type CodeBlockElementType = (typeof ELEMENT_KEYS)[number];

/**
 * Default shape per key. The root is a real `section` (it is a block of source text, and it
 * holds one or more panels); the panel itself is a real `pre`, so a caller that only knows
 * "this is code" still gets a correct element even when it overrides the wrapper.
 */
export const DEFAULT_SELECTORS: iBuilderSelectorsConfig<CodeBlockElementType> = {
  "@container": { tagName: "section", className: "code-block" },
  "@container>figure": { tagName: "figure", className: "frame" },
  "@container>figure>label": { tagName: "figcaption", className: "label" },
  "@container>figure>block": { tagName: "pre", className: "paper" },
  "@container>figure>block>source": { tagName: "code", className: "body" },
  "@container>figure>actions": { tagName: "div", className: "actions" },
  "@container>figure>actions>copy": { tagName: "button", className: "copy" },
  "@container>figure>actions>edit": { tagName: "button", className: "edit" },
  "@container>figure>actions>save": { tagName: "button", className: "save" },
  "@container>figure>actions>custom": { tagName: "button", className: "custom" },
};

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
export type iCodeBlockActionHandler = (
  parentElement: HTMLElement,
  context: iCodeBlockActionContext,
) => void | Promise<void>;

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
export const ACTION_LABELS: Record<iCodeBlockActionType, string> = {
  copy: "Copy",
  edit: "Edit",
  save: "Save",
  custom: "Run",
};

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
export function normalizePayload(data: any): iCodeBlockEntry[] {
  const toEntry = (value: any): iCodeBlockEntry | null => {
    if (typeof value === "string") return value ? { code: value } : null;
    if (!value || typeof value !== "object") return null;
    if (typeof value.code !== "string") return null;
    return { code: value.code, label: value.label, language: value.language };
  };

  const collect = (value: any): iCodeBlockEntry[] => {
    if (Array.isArray(value)) return value.map(toEntry).filter(Boolean) as iCodeBlockEntry[];
    const entry = toEntry(value);
    return entry ? [entry] : [];
  };

  if (data === null || data === undefined) return [];
  if (typeof data === "string") return collect(data);
  if (typeof data !== "object") return [];

  if (Array.isArray(data)) return collect(data);
  if (Array.isArray(data.blocks)) return collect(data.blocks);
  if (typeof data.code === "string") return collect(data);
  if (data.content !== undefined) return collect(data.content);

  return [];
}

export class CodeBlockBuilder extends Builder<CodeBlockElementType, iCodeBlockConfig> {
  readonly builderId: keyof iBuilderRegistry = "code-block";
  readonly name: keyof iBuilderRegistry = "code-block";
  readonly stylesheet: string = "./CodeBlock.css";
  public config: Required<iCodeBlockConfig>;

  /**
   * 🪶 LOADING MOCKUP — the frame's own anatomy (label, paper, action row), drawn with the
   * mandatory `@aio-ui/skeleton` primitive. The line count is the payload's business; the
   * mockup only reserves the box the sheet will take over.
   */
  protected loading(): HTMLElement {
    return Skeleton.create({
      shape: "stack",
      children: [
        { shape: "row", gap: "0.5rem", children: [{ shape: "bone", width: "30%", height: "0.9rem" }] },
        { shape: "bone", height: "12rem" },
        { shape: "row", gap: "0.5rem", children: [{ shape: "bone", width: "4.5rem", height: "1.75rem", count: 3 }] },
      ],
    });
  }

  constructor(config: Partial<iCodeBlockConfig> = {}) {
    super();

    const defaultConfig: Required<iCodeBlockConfig> = {
      themeId: "default",
      namespace: null,
      emit: () => { },
      selectors: DEFAULT_SELECTORS,
      actions: [],
    };

    this.config = this.resolveConfig(defaultConfig, config);
  }

  /**
   * Build the tree: one `figure` per entry (label above, `pre > code` below), and one
   * stack that holds them all. A block without a label simply has no caption node.
   */
  public prepare(data: any): HTMLElement {
    const entries = normalizePayload(data);

    const container = this.render("@container", { count: entries.length });

    for (const entry of entries) {
      const figure = this.render("@container>figure", entry);
      if (!figure) continue;

      if (entry.label) {
        const label = this.render("@container>figure>label", entry);
        if (label) figure.appendChild(label);
      }

      const block = this.render("@container>figure>block", entry);
      if (block) {
        const source = this.render("@container>figure>block>source", entry);
        if (source) block.appendChild(source);
        figure.appendChild(block);
      }

      // Actions live per panel: every button acts on the `code` element of its own figure.
      // Nothing is rendered when the caller configured none, so the read-only DOM is unchanged.
      const actions = this.config.actions ?? [];
      if (actions.length) {
        const row = this.render("@container>figure>actions", { count: actions.length });
        for (const action of actions) {
          const key = `@container>figure>actions>${action.type}` as CodeBlockElementType;
          const button = this.render(key, action);
          if (button) row?.appendChild(button);
        }
        if (row) figure.appendChild(row);
      }

      container?.appendChild(figure);
    }

    return this.load("@container") as HTMLElement;
  }

  /**
   * Hydration valve. Text and attributes only — `textContent`, never `innerHTML`, so
   * source that happens to contain markup is printed instead of parsed.
   */
  protected template(typeKey: CodeBlockElementType, el: HTMLElement, payload?: any): void {
    switch (typeKey) {
      case "@container>figure>label":
        el.textContent = payload?.label ?? "";
        break;

      case "@container>figure>block":
        if (payload?.language) el.dataset.language = String(payload.language);
        break;

      case "@container>figure>block>source":
        el.textContent = payload?.code ?? "";
        break;

      case "@container>figure>actions>copy":
      case "@container>figure>actions>edit":
      case "@container>figure>actions>save":
      case "@container>figure>actions>custom": {
        const button = el as HTMLButtonElement;
        const type = typeKey.split(">").pop() as iCodeBlockActionType;
        const label = payload?.label ?? ACTION_LABELS[type];
        button.type = "button";
        button.dataset.action = type;
        button.textContent = label;
        button.title = label;
        break;
      }

      default:
        break;
    }
  }

  /**
   * Wire the action buttons — one listener per button, resolved against `config.actions`.
   *
   * `edit` / `save` only flip the `contentEditable` attribute on the panel's `<code>`; the
   * committed text goes back through `textContent`, so nothing is ever parsed as HTML.
   * Reporting is the caller's: the action's own `onClick` is the sink, exactly like an
   * input field's action set — there is no separate event name to learn.
   */
  public initialize(el?: HTMLElement): void {
    const container = el ?? (this.load("@container") as HTMLElement | null);
    if (!container) return;

    container.querySelectorAll<HTMLButtonElement>("button[data-action]").forEach((button) => {
      button.addEventListener("click", (event) => this.#runAction(event, button));
    });
  }

  #runAction(event: MouseEvent, button: HTMLButtonElement): void {
    event.preventDefault();

    const type = button.dataset.action as iCodeBlockActionType | undefined;
    const action = (this.config.actions ?? []).find((entry) => entry.type === type);
    if (!type || !action || !button.closest("figure")) return;

    const figure = button.closest("figure") as HTMLElement;
    const code = (figure.querySelector("code") ?? null) as HTMLElement | null;
    const panel = (figure.querySelector("pre") ?? null) as HTMLElement | null;

    if (type === "edit" && code) {
      code.contentEditable = "true";
      figure.classList.add("editing");
      code.focus();
    }

    if (type === "save" && code) {
      const committed = (code.textContent ?? "").replace(/\s+$/, "");
      code.textContent = committed;
      code.contentEditable = "false";
      figure.classList.remove("editing");
    }

    const value = code?.textContent ?? "";

    if (type === "copy") {
      // Clipboard access is async and can be denied; a click must not throw either way.
      const clipboard = navigator.clipboard;
      if (clipboard) void clipboard.writeText(value).catch(() => undefined);
    }

    const context: iCodeBlockActionContext = {
      action: type,
      element: code,
      parentElement: figure,
      value,
      label: action.label,
      language: panel?.dataset.language,
      index: Array.from(figure.parentElement?.children ?? []).indexOf(figure),
      button,
      event,
    };

    // A handler may be async (persist the edited source); a rejection belongs to the caller.
    const outcome = action.onClick(figure, context);
    if (outcome) void outcome.catch(() => undefined);
  }
}
