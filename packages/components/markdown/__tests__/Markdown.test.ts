// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";

import { parseMarkdown } from "@aio-ui/utilities/Markdown";
import { DEFAULT_SELECTORS, ELEMENT_KEYS, MarkdownBuilder, normalizePayload } from "../Markdown";

/**
 * Two layers are pinned here:
 *
 *   1. the parser (block + inline shapes), DOM-free, and
 *   2. the rendered DOM — including the rule that source markup is TEXT, never elements.
 *
 * This file is the only suite in the repo that opts into `happy-dom`; everything else runs
 * in `environment: "node"` because a component test should not need a browser.
 */

const render = (source: string): HTMLElement => new MarkdownBuilder({}).prepare({ source });

describe("parseMarkdown", () => {
  it("keeps a pipe inside an inline code span in one table cell", () => {
    const blocks = parseMarkdown(["| a | b |", "| --- | --- |", "| `x | y` | z |"].join("\n"));
    const table = blocks[0];

    expect(table?.type).toBe("table");
    if (table?.type !== "table") return;
    expect(table.head).toHaveLength(2);
    expect(table.rows[0]).toHaveLength(2);
    expect(table.rows[0][0]).toEqual([{ type: "code", value: "x | y" }]);
  });

  it("reads headings, lists, fences and rules", () => {
    const blocks = parseMarkdown(["## Title", "", "- one", "- two", "", "```ts", "const a = 1;", "```", "", "---"].join("\n"));

    expect(blocks.map((block) => block.type)).toEqual(["heading", "list", "fence", "rule"]);
    expect(blocks[0]).toMatchObject({ level: 2, content: [{ type: "text", value: "Title" }] });
    expect(blocks[1]).toMatchObject({ ordered: false });
    expect(blocks[2]).toMatchObject({ language: "ts", code: "const a = 1;" });
  });

  it("reads ordered lists and blockquotes", () => {
    const blocks = parseMarkdown(["1. first", "2. second", "", "> quoted line"].join("\n"));

    expect(blocks[0]).toMatchObject({ type: "list", ordered: true });
    expect(blocks[1]).toMatchObject({ type: "quote" });
  });

  it("parses bold, emphasis, code and links inline", () => {
    expect(parseMarkdown("**b** _e_ `c` [l](https://x.dev)")[0]).toMatchObject({
      type: "paragraph",
      content: [
        { type: "strong", content: [{ type: "text", value: "b" }] },
        { type: "text", value: " " },
        { type: "emphasis", content: [{ type: "text", value: "e" }] },
        { type: "text", value: " " },
        { type: "code", value: "c" },
        { type: "text", value: " " },
        { type: "link", href: "https://x.dev", content: [{ type: "text", value: "l" }] },
      ],
    });
  });
});

describe("MarkdownBuilder", () => {
  it("normalizes { source } and a bare string, and nothing else", () => {
    expect(normalizePayload({ source: "# a" })).toBe("# a");
    expect(normalizePayload("# a")).toBe("# a");
    expect(normalizePayload({ blocks: [] })).toBe("");
    expect(normalizePayload(null)).toBe("");
  });

  it("declares a selector for every element key", () => {
    expect(Object.keys(DEFAULT_SELECTORS).sort()).toEqual([...ELEMENT_KEYS].sort());
  });

  it("renders the root as article.markdown", () => {
    const root = render("# Title");
    expect(root.tagName).toBe("ARTICLE");
    expect(root.className).toBe("markdown");
    expect(root.querySelector("h1")?.textContent).toBe("Title");
  });

  it("renders a GFM table with inline code in a cell", () => {
    const root = render(["| key | note |", "| --- | --- |", "| `a | b` | pipe |"].join("\n"));
    const cells = root.querySelectorAll(".markdown-table td");

    expect(root.querySelector("th")?.textContent).toBe("key");
    expect(cells).toHaveLength(2);
    expect(cells[0].querySelector("code")?.textContent).toBe("a | b");
    expect(cells[1].textContent).toBe("pipe");
  });

  it("renders a fenced block with the code-block markup", () => {
    const root = render(["```ts", "const a = 1;", "```"].join("\n"));
    const pre = root.querySelector("pre.paper");

    expect(pre).not.toBeNull();
    expect(pre?.querySelector("code.body")?.textContent).toBe("const a = 1;");
    expect((pre as HTMLElement | null)?.dataset.language).toBe("ts");
    expect(root.querySelector(".code-block .label")?.textContent).toBe("ts");
  });

  it("renders lists", () => {
    const root = render(["- one", "- two"].join("\n"));
    expect(root.querySelectorAll("ul.markdown-list > li.markdown-item")).toHaveLength(2);
  });

  it("prints <script> from the source as text, never as an element", () => {
    const root = render("Hello <script>alert(1)</script> world");

    expect(root.querySelector("script")).toBeNull();
    expect(root.textContent).toContain("<script>alert(1)</script>");
  });
});
