// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";

import { outline, parseMarkdown, selectOutline, slugify } from "../Markdown.engine";
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

const render = (payload: any): HTMLElement => new MarkdownBuilder({}).prepare(payload);

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
  it("normalizes { source }, a bare string, and nothing else", () => {
    expect(normalizePayload({ source: "# a" })).toEqual({ source: "# a", outline: null, marker: null });
    expect(normalizePayload("# a")).toEqual({ source: "# a", outline: null, marker: null });
    expect(normalizePayload({ blocks: [] }).source).toBe("");
    expect(normalizePayload(null).source).toBe("");
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

/** Two headings, a lead and a title: enough to exercise every selector shape. */
const SAMPLE = [
  "# Document",
  "",
  "The lead paragraph.",
  "",
  "## Supported syntax",
  "",
  "### Validation",
  "",
  "Validation body.",
  "",
  "### Cascade",
  "",
  "Cascade body.",
  "",
  "## Config",
  "",
  "Config body.",
].join("\n");

describe("part markers", () => {
  it("attaches a marker to the heading under it and never renders the line", () => {
    const blocks = parseMarkdown(
      ["<!-- part: id=usage role=lead-in -->", "## Validation", "", "Body."].join("\n"),
    );

    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toMatchObject({ type: "heading", level: 2, marker: { id: "usage", role: "lead-in" } });
    expect(JSON.stringify(blocks)).not.toContain("part:");
  });

  it("keeps a marker printed inside a fence as source", () => {
    const blocks = parseMarkdown(["```md", "<!-- part: id=x -->", "```"].join("\n"));

    expect(blocks[0]).toMatchObject({ type: "fence", code: "<!-- part: id=x -->" });
  });

  it("drops a plain comment that declares nothing", () => {
    const blocks = parseMarkdown(["<!-- just a note -->", "## A"].join("\n"));

    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toMatchObject({ type: "heading" });
    expect(JSON.stringify(blocks)).not.toContain("just a note");
  });

  it("reads the reference-definition shape when the document declares it", () => {
    const blocks = parseMarkdown(["[part:id=goal]: #", "## Goal"].join("\n"), { marker: { forms: ["link"] } });

    expect(blocks[0]).toMatchObject({ marker: { id: "goal" } });
  });

  it("leaves the line alone when the keyword is not the configured one", () => {
    const blocks = parseMarkdown(["<!-- part:id=one -->", "## A"].join("\n"), { marker: { keyword: "toc" } });

    expect((blocks[0] as { marker?: unknown }).marker).toBeUndefined();
    expect(blocks).toHaveLength(1);
  });
});

describe("outline", () => {
  const doc = outline(parseMarkdown(SAMPLE));

  it("puts the H1 and the blocks before the first section in their own slots", () => {
    expect(doc.title?.content).toEqual([{ type: "text", value: "Document" }]);
    expect(doc.lead).toHaveLength(1);
    expect(doc.lead[0]).toMatchObject({ type: "paragraph" });
  });

  it("keeps the trail that reaches each section", () => {
    expect(doc.sections.map((section) => section.trail)).toEqual([
      ["Supported syntax"],
      ["Supported syntax", "Validation"],
      ["Supported syntax", "Cascade"],
      ["Config"],
    ]);
  });

  it("gives an H2 the blocks under it and its H3s their own", () => {
    const syntax = doc.sections[0];
    const cascade = doc.sections[2];

    expect(syntax.blocks).toHaveLength(0);
    expect(cascade.blocks).toHaveLength(1);
    expect(doc.sections[3].blocks).toHaveLength(1);
  });

  it("slugs the heading into an id and honours a declared one", () => {
    expect(doc.sections.map((section) => section.id)).toEqual([
      "supported-syntax",
      "validation",
      "cascade",
      "config",
    ]);
    expect(slugify("Supported syntax")).toBe("supported-syntax");

    const declared = outline(parseMarkdown(["<!-- part: id=engine -->", "### Cascade"].join("\n")));
    expect(declared.sections[0].id).toBe("engine");
  });

  it("never hands two sections the same id", () => {
    const twice = outline(parseMarkdown(["## Notes", "", "a", "", "## Notes", "", "b"].join("\n")));
    expect(twice.sections.map((section) => section.id)).toEqual(["notes", "notes-2"]);
  });
});

describe("selectOutline", () => {
  const doc = outline(parseMarkdown(SAMPLE));

  it("resolves the pseudo paths", () => {
    expect(selectOutline(doc, "@lead")).toHaveLength(1);
    expect(selectOutline(doc, "@title")[0].blocks[0]).toMatchObject({ type: "heading", level: 1 });
    expect(selectOutline(doc, "@missing")).toEqual([]);
  });

  it("resolves an anchor and a heading path to the same section", () => {
    expect(selectOutline(doc, "#cascade")).toEqual(selectOutline(doc, "Supported syntax > Cascade"));
    expect(selectOutline(doc, "#nope")).toEqual([]);
  });

  it("matches a trail on length too", () => {
    expect(selectOutline(doc, "Config")).toHaveLength(1);
    expect(selectOutline(doc, "Supported syntax > Config")).toEqual([]);
  });

  it("collects every section that declares a role", () => {
    const marked = outline(
      parseMarkdown(
        [
          "<!-- part: id=a role=contract -->",
          "## A",
          "",
          "a",
          "",
          "<!-- part: id=b role=usage -->",
          "## B",
          "",
          "b",
          "",
          "<!-- part: id=c role=contract -->",
          "## C",
          "",
          "c",
        ].join("\n"),
      ),
    );

    expect(selectOutline(marked, "role:contract").map((pick) => pick.heading?.content)).toEqual([
      [{ type: "text", value: "A" }],
      [{ type: "text", value: "C" }],
    ]);
    expect(selectOutline(marked, "role:none")).toEqual([]);
  });

  it("carries the H3s nested under a selected H2, and nothing beside it", () => {
    const nested = outline(
      parseMarkdown(
        ["## A", "", "a", "", "### A1", "", "a1", "", "### A2", "", "a2", "", "## B", "", "b"].join(
          "\n",
        ),
      ),
    );

    expect(selectOutline(nested, "#a").map((pick) => pick.heading?.content)).toEqual([
      [{ type: "text", value: "A" }],
      [{ type: "text", value: "A1" }],
      [{ type: "text", value: "A2" }],
    ]);
    expect(selectOutline(nested, "A > A1")).toHaveLength(1);
  });
});

describe("outline rendering", () => {
  const sample = ["# Doc", "", "Lead.", "", "## A", "", "A body.", "", "## B", "", "B body."].join("\n");
  const headings = (root: HTMLElement): (string | null)[] =>
    [...root.querySelectorAll("h2")].map((heading) => heading.textContent);

  it("renders the whole document when no outline is given", () => {
    expect(headings(render(sample))).toEqual(["A", "B"]);
  });

  it("renders only the named parts, in the order the outline lists them", () => {
    expect(headings(render({ source: sample, outline: { parts: ["B", "A"] } }))).toEqual(["B", "A"]);
  });

  it("renders a lead part and skips a path that resolves to nothing", () => {
    const root = render({ source: sample, outline: { parts: ["@lead", "#missing"] } });

    expect(root.textContent).toBe("Lead.");
    expect(headings(root)).toEqual([]);
  });

  it("drops the heading when the outline says so", () => {
    const root = render({ source: sample, outline: { parts: ["A"], heading: "drop" } });

    expect(headings(root)).toEqual([]);
    expect(root.textContent).toBe("A body.");
  });

  it("wraps each part in a section when asked", () => {
    const root = render({ source: sample, outline: { parts: ["A", "B"], section: true } });
    const sections = [...root.children].filter((child) => child.classList.contains("markdown-section"));

    expect(sections).toHaveLength(2);
    expect(sections[0].textContent).toBe("AA body.");
  });

  it("lets the payload override the configured outline", () => {
    const configured = new MarkdownBuilder({ outline: { parts: ["B"] } });
    const root = configured.prepare({ source: sample, outline: { parts: ["A"] } });

    expect(headings(root)).toEqual(["A"]);
  });

  it("reads the marker spelling declared in the config", () => {
    const root = new MarkdownBuilder({ marker: { keyword: "toc" } }).prepare({
      source: ["<!-- toc:id=one -->", "## One"].join("\n"),
      outline: { parts: ["#one"] },
    });

    expect(headings(root)).toEqual(["One"]);
  });
});
