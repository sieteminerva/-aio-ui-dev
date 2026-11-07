import { beforeEach, describe, expect, it, vi } from "vitest";
import { ComponentRegistry, type iComponentAssetMaps } from "../ComponentRegistry";

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

const Engine = class FakeEngine {};
const TableAdapter = class FakeTableAdapter {};

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

describe("ComponentRegistry manifest contract", () => {
  let instances: FakeInstance[];

  beforeEach(() => {
    instances = [];
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
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
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
});
