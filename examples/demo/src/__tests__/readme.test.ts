import { describe, expect, it } from "vitest";

import { missingSections, parseReadme, readmeFor, sectionOf, subsectionOf } from "../readme";

const SAMPLE = `# Widget (\`@aio-ui/widget\`)

One sentence about the widget.

## Payload

\`\`\`md
## Payload
This heading lives inside a fence and must not split the document.
\`\`\`

## Config

No options.

## Nodes

| Key | Tag |
| --- | --- |
| \`@widget\` | \`div\` |

## Tokens

None.

## Wiring checklist

1. Register it.
`;

describe("parseReadme", () => {
  it("reads the H1 as the title and the text before the first H2 as the lead", () => {
    const doc = parseReadme(SAMPLE);

    expect(doc.title).toBe("Widget (`@aio-ui/widget`)");
    expect(doc.lead).toBe("One sentence about the widget.");
  });

  it("splits on H2 headings and keeps the bodies", () => {
    const doc = parseReadme(SAMPLE);

    expect(doc.sections.map((section) => section.heading)).toEqual([
      "Payload",
      "Config",
      "Nodes",
      "Tokens",
      "Wiring checklist",
    ]);
    expect(sectionOf(doc, "config")?.body).toBe("No options.");
    expect(sectionOf(doc, "Nodes")?.body).toContain("| `@widget` | `div` |");
  });

  it("ignores a heading printed inside a fence", () => {
    const doc = parseReadme(SAMPLE);

    expect(doc.sections).toHaveLength(5);
    expect(sectionOf(doc, "Payload")?.body).toContain("This heading lives inside a fence");
  });

  it("returns null for a section the document does not have", () => {
    expect(sectionOf(parseReadme(SAMPLE), "Appendix")).toBeNull();
  });

  it("slices one H3 block out of an H2 section, fence-aware", () => {
    const doc = parseReadme(
      [
        "# Widget",
        "",
        "## Supported syntax",
        "",
        "### First",
        "",
        "one",
        "",
        "```md",
        "### not a heading",
        "```",
        "",
        "### Second",
        "",
        "two",
        "",
      ].join("\n"),
    );
    const section = sectionOf(doc, "Supported syntax")!;

    const first = subsectionOf(section, "First")!;
    expect(first).toContain("one");
    expect(first).toContain("### not a heading"); // inside a fence, so still part of the block
    expect(first).not.toContain("two");

    expect(subsectionOf(section, "Second")).toBe("two");
    expect(subsectionOf(section, "Third")).toBeNull();
  });

  it("reports every required section as missing for a document without H2s", () => {
    const doc = parseReadme("# Only a title\n\nProse only.\n");

    expect(doc.sections).toEqual([]);
    expect(missingSections(doc)).toEqual(["Payload", "Config", "Nodes", "Tokens", "Wiring checklist"]);
  });

  it("keeps the whole text for the fallback path", () => {
    expect(parseReadme(SAMPLE).text).toBe(SAMPLE);
  });
});

describe("readmeFor", () => {
  it("resolves a package id and a bare folder name", () => {
    expect(readmeFor("@aio-ui/accordion")?.title).toContain("@aio-ui/accordion");
    expect(readmeFor("accordion")?.title).toBe(readmeFor("@aio-ui/accordion")?.title);
  });

  it("returns null for a package with no README in the map", () => {
    expect(readmeFor("@aio-ui/nope")).toBeNull();
  });

  it("finds the five skeleton sections in a real README", () => {
    const doc = readmeFor("@aio-ui/accordion");

    expect(doc).not.toBeNull();
    expect(missingSections(doc!)).toEqual([]);
  });
});
