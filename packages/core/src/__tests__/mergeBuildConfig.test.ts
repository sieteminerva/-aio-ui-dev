import { describe, expect, it, vi } from "vitest";
import { mergeBuildConfig } from "../ComponentRegistry";

/**
 * The merge is the whole point of the emitter injection: one publisher flows into every
 * builder config, and a component can still override or silence it per node. Pure, so it
 * can be pinned down without a DOM.
 */
describe("mergeBuildConfig", () => {
  it("injects the emitter into a config that has none", () => {
    const emit = vi.fn();

    expect(mergeBuildConfig(undefined, emit, undefined, undefined).emit).toBe(emit);
  });

  it("leaves emit out entirely when the host attaches no emitter", () => {
    const merged = mergeBuildConfig({ id: "page" }, null, undefined, undefined);

    expect("emit" in merged).toBe(false);
  });

  it("lets the node silence an inherited emitter with emit: null", () => {
    const emit = vi.fn();
    const merged = mergeBuildConfig(undefined, emit, undefined, { emit: null });

    expect(merged.emit).toBeNull();
  });

  it("lets the manifest and the node carry their own publisher", () => {
    const host = vi.fn();
    const manifestEmit = vi.fn();
    const nodeEmit = vi.fn();

    expect(mergeBuildConfig(undefined, host, { emit: manifestEmit }, undefined).emit).toBe(manifestEmit);
    expect(mergeBuildConfig(undefined, host, { emit: manifestEmit }, { emit: nodeEmit }).emit).toBe(nodeEmit);
  });

  it("keeps the layer order theme < manifest < node for plain keys", () => {
    const merged = mergeBuildConfig({ id: "from-theme", className: "theme" }, null, { id: "from-manifest" }, { id: "from-node" });

    expect(merged.id).toBe("from-node");
    expect(merged.className).toBe("theme");
  });

  it("merges selectors across the layers so a partial override keeps the rest", () => {
    const merged = mergeBuildConfig(
      { selectors: { "@menu": { id: "a" }, "@menu>item": { id: "b" } } },
      null,
      { selectors: { "@menu": { className: "c" } } },
      { selectors: { "@menu>item": { id: "d" } } }
    );

    expect(merged.selectors["@menu"]).toEqual({ id: "a", className: "c" });
    expect(merged.selectors["@menu>item"]).toEqual({ id: "d" });
  });

  it("drops an empty selectors key instead of shipping {}", () => {
    const merged = mergeBuildConfig(undefined, null, { selectors: {} }, undefined);

    expect("selectors" in merged).toBe(false);
  });
});
