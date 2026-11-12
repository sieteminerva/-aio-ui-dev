import { Builder } from "@aio-ui/base";
import { parseMarkdown } from "@aio-ui/utilities/Markdown";
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
export const ELEMENT_KEYS = [
    "@markdown",
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
];
/** Default shape per key. The root is a real `article`; headings clamp at `h4`. */
export const DEFAULT_SELECTORS = {
    "@markdown": { tagName: "article", className: "markdown" },
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
 * Payload normalizer: `{ source }` or a bare string. Everything else renders nothing,
 * because guessing at a document shape would print the wrong thing with confidence.
 */
export function normalizePayload(data) {
    if (typeof data === "string")
        return data;
    if (data && typeof data === "object" && typeof data.source === "string")
        return data.source;
    return "";
}
export class MarkdownBuilder extends Builder {
    builderId = "markdown";
    name = "markdown";
    stylesheet = "./Markdown.css";
    config;
    constructor(config = {}) {
        super();
        const defaultConfig = {
            themeId: "default",
            namespace: null,
            emit: () => { },
            selectors: DEFAULT_SELECTORS,
        };
        this.config = this.resolveConfig(defaultConfig, config);
    }
    /** Parse the source, then render one key per block. */
    prepare(data) {
        const source = normalizePayload(data);
        const blocks = source ? parseMarkdown(source) : [];
        const root = this.render("@markdown", { count: blocks.length });
        for (const block of blocks)
            this.appendBlock(root, block);
        return this.load("@markdown");
    }
    /**
     * Hydration valve. Only the leaf payloads are written here; structure is built in
     * `prepare()` because a document nests arbitrary runs of inline content.
     */
    template(typeKey, el, payload) {
        switch (typeKey) {
            case "@markdown>fence>code": {
                const language = String(payload?.language ?? "").trim();
                if (language)
                    el.dataset.language = language;
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
    initialize() { }
    /** One block → its key. Unknown kinds are skipped, never guessed at. */
    appendBlock(root, block) {
        if (!root)
            return;
        switch (block.type) {
            case "heading": {
                const level = Math.min(Math.max(block.level, 1), 4);
                const heading = this.render(`@markdown>heading-${level}`, block);
                if (!heading)
                    return;
                this.appendInline(heading, block.content);
                root.appendChild(heading);
                return;
            }
            case "paragraph": {
                const paragraph = this.render("@markdown>paragraph", block);
                if (!paragraph)
                    return;
                this.appendInline(paragraph, block.content);
                root.appendChild(paragraph);
                return;
            }
            case "fence": {
                const figure = this.render("@markdown>fence", block);
                if (!figure)
                    return;
                if (block.language) {
                    const label = this.render("@markdown>fence>label", block);
                    if (label)
                        figure.appendChild(label);
                }
                const code = this.render("@markdown>fence>code", block);
                if (code) {
                    const source = this.render("@markdown>fence>code>source", block);
                    if (source)
                        code.appendChild(source);
                    figure.appendChild(code);
                }
                root.appendChild(figure);
                return;
            }
            case "list": {
                const list = this.render(block.ordered ? "@markdown>ordered" : "@markdown>unordered", block);
                if (!list)
                    return;
                const itemKey = block.ordered ? "@markdown>ordered>item" : "@markdown>unordered>item";
                for (const item of block.items) {
                    const entry = this.render(itemKey, {});
                    if (!entry)
                        continue;
                    this.appendInline(entry, item);
                    list.appendChild(entry);
                }
                root.appendChild(list);
                return;
            }
            case "table": {
                const table = this.render("@markdown>table", block);
                if (!table)
                    return;
                const head = this.render("@markdown>table>row", {});
                if (head) {
                    for (const cell of block.head) {
                        const column = this.render("@markdown>table>row>head", {});
                        if (!column)
                            continue;
                        this.appendInline(column, cell);
                        head.appendChild(column);
                    }
                    table.appendChild(head);
                }
                for (const row of block.rows) {
                    const line = this.render("@markdown>table>row", {});
                    if (!line)
                        continue;
                    for (const cell of row) {
                        const column = this.render("@markdown>table>row>cell", {});
                        if (!column)
                            continue;
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
                if (!quote)
                    return;
                for (const child of block.blocks) {
                    if (child.type !== "paragraph") {
                        this.appendBlock(quote, child);
                        continue;
                    }
                    const paragraph = this.render("@markdown>quote>paragraph", child);
                    if (!paragraph)
                        continue;
                    this.appendInline(paragraph, child.content);
                    quote.appendChild(paragraph);
                }
                root.appendChild(quote);
                return;
            }
            case "rule": {
                const rule = this.render("@markdown>rule", {});
                if (rule)
                    root.appendChild(rule);
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
    appendInline(parent, nodes) {
        for (const node of nodes) {
            switch (node.type) {
                case "text":
                    parent.appendChild(document.createTextNode(node.value));
                    break;
                case "code": {
                    const code = this.render("@markdown>inline-code", node);
                    if (code)
                        parent.appendChild(code);
                    break;
                }
                case "strong": {
                    const strong = this.render("@markdown>strong", node);
                    if (!strong)
                        break;
                    this.appendInline(strong, node.content);
                    parent.appendChild(strong);
                    break;
                }
                case "emphasis": {
                    const em = this.render("@markdown>emphasis", node);
                    if (!em)
                        break;
                    this.appendInline(em, node.content);
                    parent.appendChild(em);
                    break;
                }
                case "link": {
                    const link = this.render("@markdown>link", node);
                    if (!link)
                        break;
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
//# sourceMappingURL=Markdown.js.map