import { describe, expect, it } from "vitest";
import { blockToNode, isPageDocument, normalizeRoute, pageToNode } from "@aio-ui/app";

/**
 * The entry itself needs a DOM to test end to end; these helpers are pure, so
 * they are the part of the contract that can be pinned down without one.
 */
describe("AioApp helpers", () => {
  it("normalises route names the same way the router does", () => {
    expect(normalizeRoute("  #Blog/ ")).toBe("blog");
    expect(normalizeRoute("")).toBe("home");
    expect(normalizeRoute(undefined, "about")).toBe("about");
  });

  it("tells a block document from a node tree by structure only", () => {
    expect(isPageDocument({ route: "home", blocks: [] })).toBe(true);
    expect(isPageDocument({ ".page": { content: {} } })).toBe(false);
    expect(isPageDocument(null)).toBe(false);
  });

  it("turns a block into a builder root and keeps reserved keys only", () => {
    const node = blockToNode({
      type: "table",
      id: "list",
      className: "is-striped",
      props: { rows: 2 },
      source: "portfolio",
      query: { limit: 5 },
    }) as Record<string, unknown>;

    expect(node.builder).toBe("table");
    expect(node.isRoot).toBe(true);
    expect(node.id).toBe("list");
    expect(node.className).toBe("is-striped");
    expect(node.content).toEqual({ rows: 2 });
    // `source`/`query` would leak as DOM attributes, so they never reach the node.
    expect(node.source).toBeUndefined();
    expect(node.query).toBeUndefined();
  });

  it("prefers nested blocks over props as the block payload", () => {
    const node = blockToNode({
      type: "form",
      props: { ignored: true },
      children: [{ type: "input", props: { name: "email" } }],
    }) as Record<string, unknown>;
    const children = node.content as Record<string, unknown>[];

    expect(Array.isArray(children)).toBe(true);
    expect(children[0].builder).toBe("input");
  });

  it("renders a node tree untouched and wraps a block document in a page root", () => {
    const tree = { ".page": { content: {} } };
    expect(pageToNode(tree)).toBe(tree);

    const node = pageToNode({ route: "home", blocks: [{ type: "table", props: {} }] }) as Record<string, any>;
    expect(node.tagName).toBe("main");
    expect(node.className).toBe("page route-home");
    expect(node.content[0].builder).toBe("table");
  });
});
