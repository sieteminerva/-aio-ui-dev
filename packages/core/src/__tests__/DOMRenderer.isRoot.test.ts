// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";

import { DOMRenderer } from "../DOMRenderer";

/**
 * A builder node has two shapes, and the difference is one key.
 *
 * Default — the node is a **host**: the key's tag is created and the component is
 * mounted inside it (`div#masonry > section.masonry`).
 * `isRoot: true` — the node is a **placeholder**: the builder root becomes the element,
 * so the anchor (`id`, classes, `attrs`) has to move onto the component itself.
 *
 * Two escapes are pinned here because they are easy to lose in a refactor: a hook
 * (`onCreated`) owns its mount and keeps the host, and a builder that resolves to
 * nothing falls back to the host instead of leaving a hole in the page.
 */

type BuildFn = (name: string, data: any) => HTMLElement | null;

/** A builder stand-in: returns a `section.masonry` root, recording every call. */
function stubBuilder(build: (name: string, data: any) => HTMLElement | null = () => {
  const node = document.createElement("section");
  node.className = "masonry";
  return node;
}) {
  return vi.fn(build) as unknown as BuildFn & { mock: { calls: any[] } };
}

function render(node: Record<string, unknown>, build: BuildFn) {
  return new DOMRenderer().render(node as any, undefined, build);
}

describe("isRoot — host versus builder root", () => {
  it("wraps the builder output by default and never builds on its own", () => {
    const build = stubBuilder();

    const out = render({ "div#masonry": { builder: "masonry", content: {} } }, build);

    expect(out.tagName).toBe("DIV");
    expect(out.id).toBe("masonry");
    expect(out.children.length).toBe(0);
    expect(build).not.toHaveBeenCalled();
  });

  it("replaces the host with the builder root when isRoot is set", () => {
    const build = stubBuilder();

    const out = render({ "div#masonry": { builder: "masonry", isRoot: true, content: {} } }, build);

    expect(out.tagName).toBe("SECTION");
    expect(out.className).toBe("masonry");
    expect(build).toHaveBeenCalledTimes(1);
    expect(build.mock.calls[0][0]).toBe("masonry");
  });

  it("moves the key's id, classes and attrs onto the builder root", () => {
    const build = stubBuilder();

    const out = render(
      { "div#masonry.cards[data-role='feed']": { builder: "masonry", isRoot: true, content: {} } },
      build,
    );

    expect(out.tagName).toBe("SECTION");
    expect(out.id).toBe("masonry");
    expect(out.classList.contains("cards")).toBe(true);
    expect(out.classList.contains("masonry")).toBe(true);
    expect(out.getAttribute("data-role")).toBe("feed");
  });

  it("keeps the host when onCreated is present, because the hook owns its mount", () => {
    const build = stubBuilder();
    const onCreated = vi.fn();

    const out = render(
      { "div#masonry": { builder: "masonry", isRoot: true, content: {}, onCreated } },
      build,
    );

    expect(out.tagName).toBe("DIV");
    expect(build).not.toHaveBeenCalled();
    expect(onCreated).toHaveBeenCalledTimes(1);
    expect(onCreated.mock.calls[0][0]).toBe(out);
  });

  it("falls back to the host when the builder resolves to nothing", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => { });
    const build = stubBuilder(() => null);

    const out = render({ "div#masonry": { builder: "missing", isRoot: true, content: {} } }, build);

    expect(out.tagName).toBe("DIV");
    expect(out.id).toBe("masonry");
    expect(build).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });

  it("warns once per builder name when the root it promised never arrives", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => { });
    const build = stubBuilder(() => null);

    render({ "div#ghost": { builder: "ghost", isRoot: true, content: {} } }, build);
    render({ "div#ghost": { builder: "ghost", isRoot: true, content: {} } }, build);

    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain("ghost");
    expect(warn.mock.calls[0][0]).toContain("keeping the host");
    warn.mockRestore();
  });

  it("adopts the builder's own records instead of orphaning them", () => {
    // The registry already gave the component a metadata closure. Replacing the host
    // means the page record and the component records now share one element, so the
    // pool has to hold both — otherwise the metadata tree stops at the root.
    const inner = document.createElement("div");
    inner.className = "card";
    const root = document.createElement("section");
    root.className = "masonry";
    root.appendChild(inner);

    const record = (key: string, element: HTMLElement, parent: string | null) => ({
      key,
      element,
      payload: null,
      relations: { scope: "", key, template: key, parent, children: [] as string[] },
    });

    (root as any).getMetadata = () => [record("section.masonry", root, null), record("div.card", inner, "section.masonry")];

    const build = stubBuilder(() => root);
    const out = render({ "div#masonry": { builder: "masonry", isRoot: true, content: {} } }, build);

    const pool = (out as any).getMetadata() as any[];
    expect(pool.some((item) => item.element === out && item.relations.template === "@masonry")).toBe(true);
    expect(pool.some((item) => item.element === inner)).toBe(true);
  });

  it("still renders nested keys inside the builder root", () => {
    const build = stubBuilder();

    const out = render(
      {
        "div#masonry": {
          builder: "masonry",
          isRoot: true,
          content: {},
          "p.note": { content: "under the feed" },
        },
      },
      build,
    );

    expect(out.tagName).toBe("SECTION");
    expect(out.querySelector("p.note")?.textContent).toBe("under the feed");
  });
});
