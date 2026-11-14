import type { iBuilderConfig, iBuilderRegistry, iBuilderSelectorsConfig } from "@aio-ui/core/interface";
import { Builder } from "@aio-ui/base";
import { Skeleton } from "@aio-ui/skeleton";
import { outline, parseMarkdown, selectOutline } from "./Markdown.engine";
import type { iMarkdownBlock, iMarkdownInline, iMarkdownMarkerConfig } from "./Markdown.engine";

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
export const ELEMENT_KEYS = [
  "@markdown",
  "@markdown>section",
  "@markdown>heading-1",
  "@markdown>heading-2",
  "@markdown>heading-3",
  "@markdown>heading-4",
  "@markdown>paragraph",
  "@markdown>fence",
  "@markdown>fence>label",
  "@markdown>fence>code",
  "@markdown>fence>code>source",
  "@markdown>unordered",
  "@markdown>unordered>item",
  "@markdown>ordered",
  "@markdown>ordered>item",
  "@markdown>table",
  "@markdown>table>row",
  "@markdown>table>row>head",
  "@markdown>table>row>cell",
  "@markdown>quote",
  "@markdown>quote>paragraph",
  "@markdown>rule",
  "@markdown>strong",
  "@markdown>emphasis",
  "@markdown>inline-code",
  "@markdown>link",
] as const;

export type MarkdownElementType = (typeof ELEMENT_KEYS)[number];

/** Default shape per key. The root is a real `article`; headings clamp at `h4`. */
export const DEFAULT_SELECTORS: iBuilderSelectorsConfig<MarkdownElementType> = {
  "@markdown": { tagName: "article", className: "markdown" },
  "@markdown>section": { tagName: "section", className: "markdown-section" },
  "@markdown>heading-1": { tagName: "h1", className: "markdown-h1" },
  "@markdown>heading-2": { tagName: "h2", className: "markdown-h2" },
  "@markdown>heading-3": { tagName: "h3", className: "markdown-h3" },
  "@markdown>heading-4": { tagName: "h4", className: "markdown-h4" },
  "@markdown>paragraph": { tagName: "p", className: "markdown-p" },
  "@markdown>fence": { tagName: "figure", className: "code-block frame" },
  "@markdown>fence>label": { tagName: "figcaption", className: "label" },
  "@markdown>fence>code": { tagName: "pre", className: "paper" },
  "@markdown>fence>code>source": { tagName: "code", className: "body" },
  "@markdown>unordered": { tagName: "ul", className: "markdown-list" },
  "@markdown>unordered>item": { tagName: "li", className: "markdown-item" },
  "@markdown>ordered": { tagName: "ol", className: "markdown-list" },
  "@markdown>ordered>item": { tagName: "li", className: "markdown-item" },
  "@markdown>table": { tagName: "table", className: "markdown-table" },
  "@markdown>table>row": { tagName: "tr", className: "markdown-row" },
  "@markdown>table>row>head": { tagName: "th", className: "markdown-head" },
  "@markdown>table>row>cell": { tagName: "td", className: "markdown-cell" },
  "@markdown>quote": { tagName: "blockquote", className: "markdown-quote" },
  "@markdown>quote>paragraph": { tagName: "p", className: "markdown-p" },
  "@markdown>rule": { tagName: "hr", className: "markdown-rule" },
  "@markdown>strong": { tagName: "strong", className: "markdown-strong" },
  "@markdown>emphasis": { tagName: "em", className: "markdown-em" },
  "@markdown>inline-code": { tagName: "code", className: "markdown-code" },
  "@markdown>link": { tagName: "a", className: "markdown-link" },
};

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
export function normalizePayload(data: any): iMarkdownPayload {
  if (typeof data === "string") return { source: data, outline: null, marker: null };
  if (!data || typeof data !== "object") return { source: "", outline: null, marker: null };

  return {
    source: typeof data.source === "string" ? data.source : "",
    outline: data.outline ?? null,
    marker: data.marker ?? null,
  };
}

export class MarkdownBuilder extends Builder<MarkdownElementType, iMarkdownConfig> {
  readonly builderId: keyof iBuilderRegistry = "markdown";
  readonly name: keyof iBuilderRegistry = "markdown";
  readonly stylesheet: string = "./Markdown.css";
  public config: Required<iMarkdownConfig>;

  /**
   * 🪶 LOADING MOCKUP — heading, paragraph, subheading, paragraph, fence, closing line:
   * the document rhythm, drawn with the mandatory `@aio-ui/skeleton` primitive. The real
   * block order is the payload's business and never read here.
   */
  protected loading(): HTMLElement {
    return Skeleton.create({
      shape: "stack",
      children: [
        { shape: "bone", width: "55%", height: "2rem" },
        { shape: "line", count: 3 },
        { shape: "bone", width: "40%", height: "1.5rem" },
        { shape: "line", count: 2 },
        { shape: "bone", height: "8rem" },
        { shape: "line", width: "80%" },
      ],
    });
  }

  constructor(config: Partial<iMarkdownConfig> = {}) {
    super();

    const defaultConfig: Required<iMarkdownConfig> = {
      themeId: "default",
      namespace: null,
      emit: () => { },
      selectors: DEFAULT_SELECTORS,
      marker: null,
      outline: null,
    };

    this.config = this.resolveConfig(defaultConfig, config);
  }

  /**
   * Parse the source, then render every block — or only the parts an outline names.
   *
   * The outline is answered from the same parse: selection happens on the AST, so a part is
   * never rebuilt as Markdown text and parsed a second time.
   */
  public prepare(data: any): HTMLElement {
    const payload = normalizePayload(data);
    const marker = payload.marker ?? this.config.marker;
    const spec = payload.outline ?? this.config.outline;

    const blocks = payload.source ? parseMarkdown(payload.source, { marker }) : [];

    const root = this.render("@markdown", { count: blocks.length });
    if (!root) return this.load("@markdown") as HTMLElement;

    const selected = Boolean(spec?.parts?.length);

    if (selected && spec) this.appendParts(root, blocks, spec);
    else for (const block of blocks) this.appendBlock(root, block);

    return this.load("@markdown") as HTMLElement;
  }

  /** Render the outline's parts in declaration order, each optionally wrapped. */
  private appendParts(root: HTMLElement, blocks: iMarkdownBlock[], spec: iMarkdownOutline): void {
    const doc = outline(blocks);

    for (const path of spec.parts) {
      for (const pick of selectOutline(doc, path)) {
        const target = spec.section ? this.render("@markdown>section", { path }) : root;
        if (!target) continue;

        if (spec.heading !== "drop" && pick.heading) this.appendBlock(target, pick.heading);
        for (const block of pick.blocks) this.appendBlock(target, block);

        if (target !== root) root.appendChild(target);
      }
    }
  }

  /**
   * Hydration valve. Only the leaf payloads are written here; structure is built in
   * `prepare()` because a document nests arbitrary runs of inline content.
   */
  protected template(typeKey: MarkdownElementType, el: HTMLElement, payload?: any): void {
    switch (typeKey) {
      case "@markdown>fence>code": {
        const language = String(payload?.language ?? "").trim();
        if (language) el.dataset.language = language;
        break;
      }

      case "@markdown>fence>label":
        el.textContent = String(payload?.language ?? "").trim();
        break;

      case "@markdown>fence>code>source":
        el.textContent = payload?.code ?? "";
        break;

      case "@markdown>inline-code":
        el.textContent = payload?.value ?? "";
        break;

      case "@markdown>link": {
        // Only the shapes this repo writes; anything else becomes an inert anchor.
        const href = String(payload?.href ?? "");
        el.setAttribute("href", /^(https?:|mailto:|#|\/|\.)/i.test(href) ? href : "#");
        break;
      }

      default:
        break;
    }
  }

  /**
   * Interaction wiring. A rendered document is inert by design: links are links, and the
   * caller decides whether to intercept them.
   */
  public initialize(): void { }

  /** One block → its key. Unknown kinds are skipped, never guessed at. */
  private appendBlock(root: HTMLElement | undefined, block: iMarkdownBlock): void {
    if (!root) return;

    switch (block.type) {
      case "heading": {
        const level = Math.min(Math.max(block.level, 1), 4);
        const heading = this.render(`@markdown>heading-${level}` as MarkdownElementType, block);
        if (!heading) return;
        this.appendInline(heading, block.content);
        root.appendChild(heading);
        return;
      }

      case "paragraph": {
        const paragraph = this.render("@markdown>paragraph", block);
        if (!paragraph) return;
        this.appendInline(paragraph, block.content);
        root.appendChild(paragraph);
        return;
      }

      case "fence": {
        const figure = this.render("@markdown>fence", block);
        if (!figure) return;

        if (block.language) {
          const label = this.render("@markdown>fence>label", block);
          if (label) figure.appendChild(label);
        }

        const code = this.render("@markdown>fence>code", block);
        if (code) {
          const source = this.render("@markdown>fence>code>source", block);
          if (source) code.appendChild(source);
          figure.appendChild(code);
        }

        root.appendChild(figure);
        return;
      }

      case "list": {
        const list = this.render(block.ordered ? "@markdown>ordered" : "@markdown>unordered", block);
        if (!list) return;

        const itemKey: MarkdownElementType = block.ordered ? "@markdown>ordered>item" : "@markdown>unordered>item";
        for (const item of block.items) {
          const entry = this.render(itemKey, {});
          if (!entry) continue;
          this.appendInline(entry, item);
          list.appendChild(entry);
        }

        root.appendChild(list);
        return;
      }

      case "table": {
        const table = this.render("@markdown>table", block);
        if (!table) return;

        const head = this.render("@markdown>table>row", {});
        if (head) {
          for (const cell of block.head) {
            const column = this.render("@markdown>table>row>head", {});
            if (!column) continue;
            this.appendInline(column, cell);
            head.appendChild(column);
          }
          table.appendChild(head);
        }

        for (const row of block.rows) {
          const line = this.render("@markdown>table>row", {});
          if (!line) continue;
          for (const cell of row) {
            const column = this.render("@markdown>table>row>cell", {});
            if (!column) continue;
            this.appendInline(column, cell);
            line.appendChild(column);
          }
          table.appendChild(line);
        }

        root.appendChild(table);
        return;
      }

      case "quote": {
        const quote = this.render("@markdown>quote", block);
        if (!quote) return;

        for (const child of block.blocks) {
          if (child.type !== "paragraph") {
            this.appendBlock(quote, child);
            continue;
          }
          const paragraph = this.render("@markdown>quote>paragraph", child);
          if (!paragraph) continue;
          this.appendInline(paragraph, child.content);
          quote.appendChild(paragraph);
        }

        root.appendChild(quote);
        return;
      }

      case "rule": {
        const rule = this.render("@markdown>rule", {});
        if (rule) root.appendChild(rule);
        return;
      }

      default:
        return;
    }
  }

  /**
   * Inline runs. A text node is the safe primitive — `innerHTML` is never used in this
   * package, which is why source that contains markup is displayed instead of parsed.
   */
  private appendInline(parent: HTMLElement, nodes: iMarkdownInline[]): void {
    for (const node of nodes) {
      switch (node.type) {
        case "text":
          parent.appendChild(document.createTextNode(node.value));
          break;

        case "code": {
          const code = this.render("@markdown>inline-code", node);
          if (code) parent.appendChild(code);
          break;
        }

        case "strong": {
          const strong = this.render("@markdown>strong", node);
          if (!strong) break;
          this.appendInline(strong, node.content);
          parent.appendChild(strong);
          break;
        }

        case "emphasis": {
          const em = this.render("@markdown>emphasis", node);
          if (!em) break;
          this.appendInline(em, node.content);
          parent.appendChild(em);
          break;
        }

        case "link": {
          const link = this.render("@markdown>link", node);
          if (!link) break;
          this.appendInline(link, node.content);
          parent.appendChild(link);
          break;
        }

        default:
          break;
      }
    }
  }
}
