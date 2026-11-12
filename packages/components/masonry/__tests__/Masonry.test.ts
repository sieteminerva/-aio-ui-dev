// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";

import { MasonryBuilder } from "../Masonry";

/**
 * Masonry renders a filter menu, a grid of items and a "more" trigger. Items are paginated by
 * `maxDisplayed`, so a short payload renders everything and no load function is called.
 */

const items = [
  { image: "a.png", title: "One", description: "First", category: "alpha" },
  { image: "b.png", title: "Two", description: "Second", category: "beta" },
];

function build(data: any, config: Record<string, any> = {}): HTMLElement {
  return new MasonryBuilder({ lazyload: false, useLoadButton: false, ...config }).create(data) as HTMLElement;
}

describe("masonry", () => {
  it("renders the gallery root and a grid for a bare array", () => {
    const root = build(items);

    expect(root.tagName).toBe("SECTION");
    expect(root.classList.contains("masonry")).toBe(true);
    expect(root.querySelector(".grid")).not.toBeNull();
  });

  it("renders one item per record with its title and description", () => {
    const root = build(items);
    const rendered = root.querySelectorAll(".grid .item");

    expect(rendered).toHaveLength(2);
    expect(rendered[0].querySelector("img")?.getAttribute("src")).toBe("a.png");
    expect(rendered[0].querySelector(".title")?.textContent).toBe("One");
    expect(rendered[0].querySelector(".desc")?.textContent).toBe("First");
  });

  it("accepts the { content } envelope", () => {
    const root = build({ content: items });

    expect(root.querySelectorAll(".grid .item")).toHaveLength(2);
  });

  it("derives the filter categories from the records", () => {
    const root = build(items);
    const labels = Array.from(root.querySelectorAll(".filter .item")).map((el) => el.textContent);

    expect(labels).toContain("alpha");
    expect(labels).toContain("beta");
  });
});
