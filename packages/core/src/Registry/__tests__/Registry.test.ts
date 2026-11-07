import { describe, expect, it, vi } from "vitest";
import { Registry, RegistryError, qualifyId, splitQualifiedId } from "../index";

describe("Registry kernel", () => {
  it("registers and resolves values by id", () => {
    const registry = new Registry<string>("component");

    registry.register("masonry", "masonry-builder");

    expect(registry.resolve("masonry")).toBe("masonry-builder");
    expect(registry.has("masonry")).toBe(true);
    expect(registry.size).toBe(1);
  });

  it("resolves unknown ids to null instead of throwing", () => {
    const registry = new Registry<string>("component");

    expect(registry.resolve("missing")).toBeNull();
    expect(registry.has("missing")).toBe(false);
    expect(registry.size).toBe(0);
  });

  it("throws MISSING_ENTRY when require() cannot resolve", () => {
    const registry = new Registry<string>("component");

    expect(() => registry.require("missing")).toThrowError(RegistryError);
    try {
      registry.require("missing");
    } catch (error) {
      expect((error as RegistryError).code).toBe("MISSING_ENTRY");
      expect((error as RegistryError).scope).toBe("component");
      expect((error as RegistryError).id).toBe("missing");
    }
  });

  it("keeps registration order in entries() and ids()", () => {
    const registry = new Registry<number>("order");
    registry.register("a", 1).register("b", 2).register("c", 3);

    expect(registry.ids()).toEqual(["a", "b", "c"]);
    expect(registry.entries()).toEqual([
      { id: "a", value: 1 },
      { id: "b", value: 2 },
      { id: "c", value: 3 },
    ]);
  });

  it("returns defensive copies from entries() and ids()", () => {
    const registry = new Registry<number>("order").register("a", 1);

    registry.ids().push("b");
    registry.entries().push({ id: "c", value: 3 });

    expect(registry.ids()).toEqual(["a"]);
    expect(registry.size).toBe(1);
  });

  describe("duplicate policy", () => {
    it("throws DUPLICATE_ID by default", () => {
      const registry = new Registry<string>("component").register("masonry", "first");

      expect(() => registry.register("masonry", "second")).toThrowError(RegistryError);

      try {
        registry.register("masonry", "second");
      } catch (error) {
        expect((error as RegistryError).code).toBe("DUPLICATE_ID");
      }
      expect(registry.resolve("masonry")).toBe("first");
    });

    it("replaces silently when policy is replace", () => {
      const registry = new Registry<string>("component", { duplicate: "replace" });
      registry.register("masonry", "first").register("masonry", "second");

      expect(registry.resolve("masonry")).toBe("second");
      expect(registry.size).toBe(1);
    });

    it("warns and replaces when policy is warn", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      const registry = new Registry<string>("component", { duplicate: "warn" });

      registry.register("masonry", "first").register("masonry", "second");

      expect(registry.resolve("masonry")).toBe("second");
      expect(warn).toHaveBeenCalledTimes(1);
      warn.mockRestore();
    });

    it("keeps the existing value when policy is ignore", () => {
      const registry = new Registry<string>("component", { duplicate: "ignore" });
      registry.register("masonry", "first").register("masonry", "second");

      expect(registry.resolve("masonry")).toBe("first");
    });

    it("never disposes a replaced value", () => {
      const disposed: string[] = [];
      const registry = new Registry<string>("component", {
        duplicate: "replace",
        onDispose: (value) => disposed.push(value),
      });

      registry.register("masonry", "first").register("masonry", "second");

      expect(disposed).toEqual([]);
    });
  });

  describe("removal", () => {
    it("unregisters an existing entry and reports it", () => {
      const registry = new Registry<string>("component").register("masonry", "builder");

      expect(registry.unregister("masonry")).toBe(true);
      expect(registry.has("masonry")).toBe(false);
      expect(registry.size).toBe(0);
    });

    it("reports false when unregistering an absent entry", () => {
      const registry = new Registry<string>("component");

      expect(registry.unregister("absent")).toBe(false);
    });

    it("disposes every entry on clear()", () => {
      const disposed: string[] = [];
      const registry = new Registry<string>("component", {
        onDispose: (value, id) => disposed.push(`${id}:${value}`),
      });

      registry.register("a", "1").register("b", "2");
      registry.clear();

      expect(registry.size).toBe(0);
      expect(disposed).toEqual(["a:1", "b:2"]);
    });
  });

  describe("validation and isolation", () => {
    it("rejects malformed scopes", () => {
      expect(() => new Registry<string>("")).toThrowError(RegistryError);

      try {
        new Registry<string>("   ");
      } catch (error) {
        expect((error as RegistryError).code).toBe("INVALID_SCOPE");
      }
    });

    it("trims a valid scope label", () => {
      const registry = new Registry<string>("  form  ");

      expect(registry.scope).toBe("form");
    });

    it("rejects empty ids", () => {
      const registry = new Registry<string>("component");

      try {
        registry.register("", "value");
      } catch (error) {
        expect((error as RegistryError).code).toBe("INVALID_ID");
      }
      expect(registry.size).toBe(0);
    });

    it("keeps separate instances isolated", () => {
      const first = new Registry<string>("form", { duplicate: "replace" });
      const second = new Registry<string>("form", { duplicate: "replace" });

      first.register("cascade", "first-cascade");

      expect(second.has("cascade")).toBe(false);
      expect(second.size).toBe(0);
    });
  });
});

describe("registry scope helpers", () => {
  it("qualifies and splits ids round-trip", () => {
    const qualified = qualifyId("form", "cascade");

    expect(qualified).toBe("form:cascade");
    expect(splitQualifiedId(qualified)).toEqual({ scope: "form", id: "cascade" });
  });

  it("keeps colons that belong to the id", () => {
    expect(splitQualifiedId("form:input:cascade")).toEqual({
      scope: "form",
      id: "input:cascade",
    });
  });

  it("returns null for malformed qualified ids", () => {
    expect(splitQualifiedId("form")).toBeNull();
    expect(splitQualifiedId(":id")).toBeNull();
    expect(splitQualifiedId("scope:")).toBeNull();
  });
});
