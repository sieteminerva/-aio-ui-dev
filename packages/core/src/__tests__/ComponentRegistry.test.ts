import { beforeEach, describe, expect, it, vi } from "vitest";
import { collectComponentNames, ComponentRegistry, type iComponentAssetMaps } from "../ComponentRegistry";
import { BUILDER_INSTANCE } from "../Registry/BuilderInstances";

/**
 * Registry behaviour under the single-manifest contract.
 *
 * The environment is Node, so builders are fakes: `build()` only requires that
 * `create()` returns something truthy, and the registry never inspects the
 * returned node beyond handing it back.
 */

interface FakeInstance {
  config: Record<string, unknown>;
  modules: Record<string, unknown>;
  content: unknown;
  isLoaded: boolean;
}

function makeBuilderClass(sink: FakeInstance[]) {
  return class FakeBuilder {
    static stylesheet = undefined;

    config: Record<string, unknown>;
    modules: Record<string, unknown> = {};
    content: unknown;
    isLoaded = true;

    constructor(config: Record<string, unknown> = {}) {
      this.config = config;
    }

    provideModules(modules: Record<string, unknown>): void {
      this.modules = modules;
    }

    create(content: unknown): unknown {
      this.content = content;
      sink.push(this as unknown as FakeInstance);
      return { tagName: "DIV" } as unknown as HTMLElement;
    }
  };
}

const Engine = class FakeEngine { };
const TableAdapter = class FakeTableAdapter { };

function makeAssets(overrides: Partial<iComponentAssetMaps["modules"]> = {}): iComponentAssetMaps {
  return {
    modules: {
      "@fake/form": async () => ({ default: makeBuilderClass([]) }),
      "@fake/engine/validation": async () => ({ default: Engine }),
      "@fake/table/adapter": async () => ({ default: TableAdapter }),
      ...overrides,
    },
    styles: {},
  };
}

describe("ComponentRegistry — one module, several builders", () => {
  let instances: FakeInstance[] = [];

  beforeEach(() => {
    instances = [];
  });

  /** A package like `@aio-ui/product`: several builders behind one path. */
  function productAssets() {
    class GridBuilder extends makeBuilderClass(instances) {}
    class DetailBuilder extends makeBuilderClass(instances) {}
    return makeAssets({ "@fake/product": async () => ({ GridBuilder, DetailBuilder }) });
  }

  it("resolves each word to the export its manifest names", async () => {
    const registry = new ComponentRegistry(productAssets());
    registry.register("product-card-grid", () => ({ path: "@fake/product", export: "GridBuilder" }));
    registry.register("product-detail", () => ({ path: "@fake/product", export: "DetailBuilder" }));

    await registry.load(["product-card-grid", "product-detail"]);
    registry.build("product-card-grid", {});
    registry.build("product-detail", {});

    expect(instances.map((instance) => instance.constructor.name)).toEqual(["GridBuilder", "DetailBuilder"]);
  });

  it("falls back to the first exported function when the manifest names none", async () => {
    const registry = new ComponentRegistry(productAssets());
    registry.register("product-card-grid", () => ({ path: "@fake/product" }));
    registry.register("product-detail", () => ({ path: "@fake/product" }));

    await registry.load(["product-card-grid", "product-detail"]);
    registry.build("product-card-grid", {});
    registry.build("product-detail", {});

    // Both words land on the same class — the bug the `export` field exists to prevent.
    expect(instances[0].constructor).toBe(instances[1].constructor);
  });

  it("warns in development when a module is ambiguous and the manifest stays silent", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const registry = new ComponentRegistry(productAssets());
    registry.register("product-card-grid", () => ({ path: "@fake/product" }));

    await registry.load(["product-card-grid"]);

    expect(warn).toHaveBeenCalledWith(expect.stringContaining("no \"export\" was declared"));
    warn.mockRestore();
  });
});

describe("ComponentRegistry manifest contract", () => {
  let instances: FakeInstance[];

  beforeEach(() => {
    instances = [];
  });

  it("pins the instance on the element it returns, so a discarded subtree can destroy it", async () => {
    const registry = new ComponentRegistry(
      makeAssets({ "@fake/form": async () => ({ default: makeBuilderClass(instances) }) }),
    );
    registry.register("form", () => ({ path: "@fake/form" }));

    await registry.load(["form"]);
    const element = registry.build("form", {}) as unknown as Record<symbol, unknown>;

    // The registry is the only owner that replaces whole trees, so it is the only
    // writer of the pin — `Builder.create()` stays free of it.
    expect(element[BUILDER_INSTANCE]).toBe(instances[0]);

    const host = { querySelectorAll: () => [element] } as unknown as ParentNode;
    expect(registry.releaseBuilders(host)).toBe(1);
    expect(element[BUILDER_INSTANCE]).toBeUndefined();
  });

  it("loads the module declared by the manifest and builds from the cache", async () => {
    const registry = new ComponentRegistry(
      makeAssets({ "@fake/form": async () => ({ default: makeBuilderClass(instances) }) }),
    );
    registry.register("form", () => ({ path: "@fake/form" }));

    await registry.load(["form"]);
    const element = registry.build("form", { config: { b: 2 } });

    expect(element).toBeTruthy();
    expect(instances).toHaveLength(1);
  });

  it("merges manifest config under the node config", async () => {
    const registry = new ComponentRegistry(
      makeAssets({ "@fake/form": async () => ({ default: makeBuilderClass(instances) }) }),
    );
    registry.register("form", () => ({ path: "@fake/form", config: { a: 1, shared: "manifest" } }));

    await registry.load(["form"]);
    registry.build("form", { config: { b: 2, shared: "node" } });

    expect(instances[0].config).toMatchObject({ a: 1, b: 2, shared: "node" });
  });

  it("hands the manifest schema to the builder instead of the node content", async () => {
    const registry = new ComponentRegistry(
      makeAssets({ "@fake/form": async () => ({ default: makeBuilderClass(instances) }) }),
    );
    registry.register("form", () => ({ path: "@fake/form", schema: { from: "schema" } }));

    await registry.load(["form"]);
    registry.build("form", { content: { from: "node" } });

    expect(instances[0].content).toEqual({ from: "schema" });
  });

  it("falls back to the node content when the manifest declares no schema", async () => {
    const registry = new ComponentRegistry(
      makeAssets({ "@fake/form": async () => ({ default: makeBuilderClass(instances) }) }),
    );
    registry.register("form", () => ({ path: "@fake/form" }));

    await registry.load(["form"]);
    registry.build("form", { content: { from: "node" } });

    expect(instances[0].content).toEqual({ from: "node" });
  });

  it("resolves declared sub-modules and provides them to the builder", async () => {
    const registry = new ComponentRegistry(
      makeAssets({ "@fake/form": async () => ({ default: makeBuilderClass(instances) }) }),
    );
    registry.register("form", () => ({
      path: "@fake/form",
      modules: [
        { id: "validation", path: "@fake/engine/validation" },
        { id: "table", path: "@fake/table/adapter" },
      ],
    }));

    await registry.load(["form"]);
    registry.build("form", {});

    expect(instances[0].modules).toEqual({ validation: Engine, table: TableAdapter });
  });

  it("keeps the component usable when a declared module cannot be resolved", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => { });
    const registry = new ComponentRegistry(
      makeAssets({ "@fake/form": async () => ({ default: makeBuilderClass(instances) }) }),
    );
    registry.register("form", () => ({
      path: "@fake/form",
      modules: [{ id: "missing", path: "@fake/does-not-exist" }],
    }));

    await registry.load(["form"]);
    registry.build("form", {});

    expect(instances).toHaveLength(1);
    expect(instances[0].modules).toEqual({});
    warn.mockRestore();
  });

  it("does not re-load a module that was already resolved", async () => {
    const engineLoader = vi.fn(async () => ({ default: Engine }));
    const registry = new ComponentRegistry(
      makeAssets({
        "@fake/form": async () => ({ default: makeBuilderClass(instances) }),
        "@fake/engine/validation": engineLoader,
      }),
    );
    registry.register("form", () => ({
      path: "@fake/form",
      modules: [{ id: "validation", path: "@fake/engine/validation" }],
    }));

    await registry.load(["form"]);
    await registry.load(["form"]);
    registry.build("form", {});
    registry.build("form", {});

    expect(engineLoader).toHaveBeenCalledTimes(1);
  });

  it("ignores names that are not registered", async () => {
    const registry = new ComponentRegistry(makeAssets());

    await expect(registry.load(["nope"])).resolves.toBeUndefined();
  });

  it("throws when building a component that was never loaded", () => {
    const registry = new ComponentRegistry(makeAssets());
    registry.register("form", () => ({ path: "@fake/form" }));

    expect(() => registry.build("form", {})).toThrow(/not preloaded|not a Builder/);
  });

  it("resolves a module id that names another registered component", async () => {
    const tableInstances: FakeInstance[] = [];
    const registry = new ComponentRegistry(
      makeAssets({
        "@fake/form": async () => ({ default: makeBuilderClass(instances) }),
        "@fake/table": async () => ({ default: makeBuilderClass(tableInstances) }),
      }),
    );
    registry.register("table", () => ({ path: "@fake/table" }));
    registry.register("form", () => ({ path: "@fake/form", modules: [{ id: "table" }] }));

    await registry.load(["form"]);
    registry.build("form", {});

    expect(instances[0].modules.table).toBeTypeOf("function");
    // The standalone component was loaded through its own manifest.
    expect(() => registry.build("table", {})).not.toThrow();
  });

  it("resolves two words pointing at one module with different export names", async () => {
    class AlphaBuilder {
      create() {
        return { tag: "alpha" };
      }
    }
    class BetaBuilder {
      create() {
        return { tag: "beta" };
      }
    }

    const registry = new ComponentRegistry({
      modules: {
        "@fake/shared-bundle": async () => ({
          AlphaBuilder,
          BetaBuilder,
        }),
      },
      styles: {},
    });

    registry.register("product", () => ({
      path: "@fake/shared-bundle",
      export: "AlphaBuilder",
    }));
    registry.register("table", () => ({
      path: "@fake/shared-bundle",
      export: "BetaBuilder",
    }));

    await registry.load(["product", "table"]);

    expect(registry.build("product", {})).toMatchObject({ tag: "alpha" });
    expect(registry.build("table", {})).toMatchObject({ tag: "beta" });
  });

  it("warns in DEV mode when a module has >1 builder and no export is specified", async () => {
    class FirstBuilder {
      create() {
        return { tag: "first" };
      }
    }
    class SecondBuilder {
      create() {
        return { tag: "second" };
      }
    }

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const registry = new ComponentRegistry({
      modules: {
        "@fake/multi-bundle": async () => ({
          FirstBuilder,
          SecondBuilder,
        }),
      },
      styles: {},
    });

    registry.register("product", () => ({
      path: "@fake/multi-bundle",
    }));

    await registry.load(["product"]);

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('exports 2 candidates ("FirstBuilder", "SecondBuilder"), but no "export" was declared')
    );
    warnSpy.mockRestore();
  });

  it("picks the named export a module ref asks for", async () => {
    const registry = new ComponentRegistry({
      modules: {
        "@fake/form": async () => ({ default: makeBuilderClass(instances) }),
        "@fake/adapters": async () => ({ default: Engine, cascadeAdapter: TableAdapter }),
      },
      styles: {},
    });
    registry.register("form", () => ({
      path: "@fake/form",
      modules: [{ id: "cascade", path: "@fake/adapters", export: "cascadeAdapter" }],
    }));

    await registry.load(["form"]);
    registry.build("form", {});

    expect(instances[0].modules.cascade).toBe(TableAdapter);
  });

  it("survives a two-way modules reference", async () => {
    const registry = new ComponentRegistry(
      makeAssets({
        "@fake/form": async () => ({ default: makeBuilderClass(instances) }),
        "@fake/table": async () => ({ default: makeBuilderClass([]) }),
      }),
    );
    registry.register("table", () => ({ path: "@fake/table", modules: [{ id: "form" }] }));
    registry.register("form", () => ({ path: "@fake/form", modules: [{ id: "table" }] }));

    await expect(registry.load(["form"])).resolves.toBeUndefined();
    registry.build("form", {});

    expect(instances).toHaveLength(1);
  });

  it("loads every component a page source needs, without a name list", async () => {
    const registry = new ComponentRegistry(
      makeAssets({
        "@fake/form": async () => ({ default: makeBuilderClass(instances) }),
        "@fake/table": async () => ({ default: makeBuilderClass([]) }),
      }),
    );
    registry.register("form", () => ({ path: "@fake/form" }));
    registry.register("table", () => ({ path: "@fake/table" }));

    const page = [{ builder: "form", content: [] }, { builder: "table", content: [] }];
    const loaded = await registry.loadFor(page);

    expect(loaded).toEqual(["form", "table"]);
    expect(() => registry.build("form", {})).not.toThrow();
    expect(() => registry.build("table", {})).not.toThrow();
  });
});

describe("collectComponentNames", () => {
  it("finds builder nodes in order and de-duplicates", () => {
    const source = [
      { builder: "form", content: [] },
      { builder: "table", content: [] },
      { builder: "form", content: [] },
    ];

    expect(collectComponentNames(source)).toEqual(["form", "table"]);
  });

  it("finds page blocks but not input descriptors", () => {
    const source = {
      blocks: [
        { type: "masonry", source: "portfolio" },
        { type: "hero", props: { title: "hi" } },
      ],
      fields: [{ type: "text" }, { type: "select" }],
    };

    expect(collectComponentNames(source)).toEqual(["masonry"]);
  });

  it("ignores primitives and survives cycles", () => {
    const node: Record<string, unknown> = { builder: "form" };
    node.self = node;

    expect(collectComponentNames({ nested: [node, null, 42, "text"] })).toEqual(["form"]);
  });

  it("ignores a builder array: a node names one component, a route names the rest", () => {
    const source = {
      "main#blog": { builder: ["article", "table"], onCreated: () => { } },
      "#wizard": { builder: ["form"] },
    };

    expect(collectComponentNames(source)).toEqual([]);
  });
});
