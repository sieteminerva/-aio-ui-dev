// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";

import { BUILDER_INSTANCE, attachBuilder, releaseBuilders } from "../BuilderInstances";

/**
 * The pin is the whole teardown mechanism: a builder writes itself on the root it
 * returned, and whoever discards that subtree destroys what it finds. No side table,
 * so nothing can leak between an element and its instance.
 */

function host(): HTMLElement {
  return document.createElement("div");
}

describe("builder pin / release", () => {
  it("destroys every pinned builder in a subtree, nested ones included", () => {
    const tree = host();
    const outer = { destroy: vi.fn() };
    const inner = { destroy: vi.fn() };
    const nested = document.createElement("section");
    const leaf = document.createElement("span");
    nested.appendChild(leaf);
    tree.appendChild(nested);

    attachBuilder(tree, outer);
    attachBuilder(leaf, inner);

    expect(releaseBuilders(tree)).toBe(2);
    expect(outer.destroy).toHaveBeenCalledTimes(1);
    expect(inner.destroy).toHaveBeenCalledTimes(1);
    expect((tree as any)[BUILDER_INSTANCE]).toBeUndefined();
    expect((leaf as any)[BUILDER_INSTANCE]).toBeUndefined();
  });

  it("is idempotent: a second sweep over the same tree does nothing", () => {
    const tree = host();
    const instance = { destroy: vi.fn() };
    attachBuilder(tree, instance);

    releaseBuilders(tree);
    releaseBuilders(tree);

    expect(instance.destroy).toHaveBeenCalledTimes(1);
  });

  it("keeps going when one builder throws", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => { });
    const tree = host();
    const broken = document.createElement("div");
    const sound = document.createElement("div");
    tree.appendChild(broken);
    tree.appendChild(sound);
    const brokenInstance = { destroy: () => { throw new Error("boom"); } };
    const soundInstance = { destroy: vi.fn() };
    attachBuilder(broken, brokenInstance);
    attachBuilder(sound, soundInstance);

    expect(releaseBuilders(tree)).toBe(2);
    expect(soundInstance.destroy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalled();

    spy.mockRestore();
  });

  it("returns 0 for a tree nobody pinned, and for no tree at all", () => {
    expect(releaseBuilders(host())).toBe(0);
    expect(releaseBuilders(null)).toBe(0);
  });
});
