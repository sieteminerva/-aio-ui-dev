import { describe, expect, it, vi } from "vitest";
import { ModuleRegistry } from "../ModuleRegistry";
import type { iModuleDefinition } from "../ModuleRegistry";

interface iTestContext {
  formId: string;
}

interface iTestInstance {
  id: string;
}

/** Builds a passive definition; storage tests never call `load()`. */
function createDefinition(id: string): iModuleDefinition<iTestContext, iTestInstance> {
  return {
    id,
    load: () => ({ id }),
  };
}

describe("ModuleRegistry", () => {
  it("registers definitions and reports them", () => {
    const registry = new ModuleRegistry<iTestContext, iTestInstance>("form").register(
      createDefinition("validation"),
    );

    expect(registry.has("validation")).toBe(true);
    expect(registry.ids()).toEqual(["validation"]);
    expect(registry.size).toBe(1);
    expect(registry.resolve("validation")?.id).toBe("validation");
  });

  it("resolves unknown ids to null", () => {
    const registry = new ModuleRegistry<iTestContext, iTestInstance>("form");

    expect(registry.resolve("missing")).toBeNull();
    expect(registry.has("missing")).toBe(false);
  });

  it("keeps registration order in ids()", () => {
    const registry = new ModuleRegistry<iTestContext, iTestInstance>("form")
      .register(createDefinition("validation"))
      .register(createDefinition("cascade"));

    expect(registry.ids()).toEqual(["validation", "cascade"]);
  });

  it("never loads or instantiates definitions", () => {
    const load = vi.fn(() => ({ id: "validation" }));
    const registry = new ModuleRegistry<iTestContext, iTestInstance>("form").register({
      id: "validation",
      load,
    });

    registry.resolve("validation");
    registry.has("validation");
    registry.ids();

    expect(load).not.toHaveBeenCalled();
  });

  it("warns instead of throwing on duplicate registration by default", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const registry = new ModuleRegistry<iTestContext, iTestInstance>("form");

    registry.register(createDefinition("validation"));
    registry.register(createDefinition("validation"));

    expect(registry.size).toBe(1);
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });

  it("rejects malformed scopes", () => {
    expect(() => new ModuleRegistry<iTestContext, iTestInstance>("")).toThrow();
  });
});
