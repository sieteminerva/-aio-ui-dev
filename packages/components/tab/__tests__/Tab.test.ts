// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";

import { TabBuilder } from "../Tab";

/**
 * A tab set is a menu plus one panel per body item. Panels are built lazily by default, so the
 * content test turns `lazyload` off to have something to assert on.
 */

function build(content: any, config: Record<string, any> = {}): HTMLElement {
  return new TabBuilder({ lazyload: false, ...config }).create(content) as HTMLElement;
}

const content = {
  menu: [{ label: "Satu", title: "Satu" }],
  body: [{ content: { title: "Isi", description: "Desc" } }],
};

describe("tab", () => {
  it("renders a tab root with a menu item per menu record", () => {
    const root = build(content);

    expect(root.classList.contains("tab")).toBe(true);
    const items = root.querySelectorAll(".menu button.button");
    expect(items).toHaveLength(1);
    expect(items[0].getAttribute("role")).toBe("tab");
    expect(items[0].querySelector(".btn-label")?.textContent).toBe("Satu");
  });

  it("renders one panel per body item with its content", () => {
    const root = build(content);
    const panels = root.querySelectorAll(".body .panel");

    expect(panels).toHaveLength(1);
    expect(panels[0].getAttribute("role")).toBe("tabpanel");
    expect(panels[0].querySelector(".content .title")?.textContent).toBe("Isi");
    expect(panels[0].querySelector(".content .desc")?.textContent).toBe("Desc");
  });

  it("renders the footer only when the payload has one", () => {
    expect(build(content).querySelector(".footer")).toBeNull();
    expect(build({ ...content, footer: { text: "Catatan" } }).querySelector(".footer")).not.toBeNull();
  });

  it("marks only the first menu item as selected on first paint", () => {
    const root = build({
      menu: [
        { label: "Satu", title: "Satu" },
        { label: "Dua", title: "Dua" },
      ],
      body: [{ content: { title: "A" } }, { content: { title: "B" } }],
    });
    const items = root.querySelectorAll(".menu button.button");

    expect(items).toHaveLength(2);
    expect(items[0].getAttribute("aria-selected")).toBe("true");
    expect(items[0].classList.contains("active")).toBe(true);
    expect(items[1].getAttribute("aria-selected")).toBe("false");
  });
});
