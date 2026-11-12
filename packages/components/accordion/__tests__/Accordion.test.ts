// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";

import { AccordionBuilder } from "../Accordion";

/**
 * Accordion is one of the older builders: its selector map lives in the constructor, so the
 * contract is checked through the rendered DOM instead of an exported table.
 *
 * `prepare()` accepts a `{ content }` envelope whose items are `{ title, description }`.
 */

function build(content: any[] | any): HTMLElement {
  return new AccordionBuilder().create({ content }) as HTMLElement;
}

describe("accordion", () => {
  it("renders one details/summary per item", () => {
    const root = build([
      { title: "First", description: "One" },
      { title: "Second", description: "Two" },
    ]);

    const sections = root.querySelectorAll("details");
    expect(root.tagName.toLowerCase()).toBe("div");
    expect(root.classList.contains("accordion")).toBe(true);
    expect(sections).toHaveLength(2);
    expect(sections[0].querySelector("summary")?.textContent).toBe("First");
    expect(sections[0].querySelector(".content p.desc")?.textContent).toBe("One");
  });

  it("accepts a single item without an array", () => {
    const root = build({ title: "Only", description: "Body" });

    expect(root.querySelectorAll("details")).toHaveLength(1);
    expect(root.querySelector("summary")?.textContent).toBe("Only");
  });

  it("invents no copy for a record without a title", () => {
    const root = build([{}]);

    // The placeholder branches only fire for an empty string, not for a missing value.
    expect(root.querySelector("summary")?.textContent).toBe("");
    expect(root.querySelector(".content")).not.toBeNull();
  });
});
