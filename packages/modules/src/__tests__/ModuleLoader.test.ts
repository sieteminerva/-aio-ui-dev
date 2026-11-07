import { describe, expect, it } from "vitest";
import { ModuleLoader } from "../ModuleLoader";
import type { iModuleDefinition } from "../ModuleRegistry";
import { RegistryError } from "@aio-ui/core/Registry";

interface iTestContext {
  formId: string;
}

interface iTestInstance {
  id: string;
  context: iTestContext;
}

/** Builds a definition that records load and destroy calls into the supplied ledger. */
function createDefinition(
  id: string,
  ledger: string[],
  extra: Partial<iModuleDefinition<iTestContext, iTestInstance>> = {},
): iModuleDefinition<iTestContext, iTestInstance> {
  return {
    id,
    load: (context) => {
      ledger.push(`load:${id}`);
      return { id, context };
    },
    destroy: (instance) => {
      ledger.push(`destroy:${instance.id}`);
    },
    ...extra,
  };
}

describe("ModuleLoader", () => {
  it("registers the preset definitions supplied to the constructor", () => {
    const loader = new ModuleLoader<iTestContext, iTestInstance>("form", [
      createDefinition("validation", []),
      createDefinition("cascade", []),
    ]);

    expect(loader.ids()).toEqual(["validation", "cascade"]);
    expect(loader.has("cascade")).toBe(true);
    expect(loader.registry.scope).toBe("form");
  });

  it("loads a module with the supplied context", () => {
    const ledger: string[] = [];
    const loader = new ModuleLoader<iTestContext, iTestInstance>("form", [
      createDefinition("validation", ledger),
    ]);

    const instance = loader.load("validation", { formId: "contact" });

    expect(instance?.id).toBe("validation");
    expect(instance?.context.formId).toBe("contact");
    expect(loader.isLoaded("validation")).toBe(true);
    expect(loader.loadedIds()).toEqual(["validation"]);
    expect(ledger).toEqual(["load:validation"]);
  });

  it("returns null for an unregistered module", () => {
    const loader = new ModuleLoader<iTestContext, iTestInstance>("form");

    expect(loader.load("missing", { formId: "contact" })).toBeNull();
  });

  it("skips a module whose matches predicate rejects the context", () => {
    const ledger: string[] = [];
    const loader = new ModuleLoader<iTestContext, iTestInstance>("form", [
      createDefinition("contactOnly", ledger, {
        matches: (context) => context.formId === "contact",
      }),
    ]);

    expect(loader.load("contactOnly", { formId: "archive" })).toBeNull();
    expect(loader.isLoaded("contactOnly")).toBe(false);
    expect(ledger).toEqual([]);
  });

  it("loads a module whose matches predicate accepts the context", () => {
    const ledger: string[] = [];
    const loader = new ModuleLoader<iTestContext, iTestInstance>("form", [
      createDefinition("contactOnly", ledger, {
        matches: (context) => context.formId === "contact",
      }),
    ]);

    expect(loader.load("contactOnly", { formId: "contact" })?.id).toBe("contactOnly");
    expect(ledger).toEqual(["load:contactOnly"]);
  });

  it("resolves nested requirements without reloading them twice", () => {
    const ledger: string[] = [];
    const loader = new ModuleLoader<iTestContext, iTestInstance>("form", [
      createDefinition("base", ledger),
      createDefinition("middle", ledger, { requires: ["base"] }),
      createDefinition("top", ledger, { requires: ["middle"] }),
    ]);

    loader.load("top", { formId: "contact" });

    expect(ledger).toEqual(["load:base", "load:middle", "load:top"]);
    expect(loader.loadedIds()).toEqual(["base", "middle", "top"]);
  });

  it("skips already loaded modules on a second resolveAll", () => {
    const ledger: string[] = [];
    const loader = new ModuleLoader<iTestContext, iTestInstance>("form", [
      createDefinition("validation", ledger),
    ]);

    const first = loader.resolveAll({ formId: "contact" });
    const second = loader.resolveAll({ formId: "contact" });

    expect(first).toHaveLength(1);
    expect(second).toEqual([]);
    expect(ledger).toEqual(["load:validation"]);
  });

  it("exposes a settled instance without reloading it", () => {
    const ledger: string[] = [];
    const loader = new ModuleLoader<iTestContext, iTestInstance>("form", [
      createDefinition("validation", ledger),
    ]);

    loader.resolveAll({ formId: "contact" });

    expect(loader.loaded("validation")?.id).toBe("validation");
    expect(loader.loaded("missing")).toBeNull();
    expect(ledger).toEqual(["load:validation"]);
  });

  it("destroys the previous instance before reloading", () => {
    const ledger: string[] = [];
    const loader = new ModuleLoader<iTestContext, iTestInstance>("form", [
      createDefinition("validation", ledger),
    ]);

    loader.load("validation", { formId: "first" });
    loader.load("validation", { formId: "second" });

    expect(ledger).toEqual(["load:validation", "destroy:validation", "load:validation"]);
    expect(loader.loadedIds()).toEqual(["validation"]);
  });

  it("destroys and forgets one module on unload", () => {
    const ledger: string[] = [];
    const loader = new ModuleLoader<iTestContext, iTestInstance>("form", [
      createDefinition("validation", ledger),
    ]);

    loader.load("validation", { formId: "contact" });

    expect(loader.unload("validation")).toBe(true);
    expect(loader.unload("validation")).toBe(false);
    expect(loader.isLoaded("validation")).toBe(false);
    expect(ledger).toEqual(["load:validation", "destroy:validation"]);
  });

  it("unloads every module newest first", () => {
    const ledger: string[] = [];
    const loader = new ModuleLoader<iTestContext, iTestInstance>("form", [
      createDefinition("first", ledger),
      createDefinition("second", ledger),
    ]);

    loader.load("first", { formId: "contact" });
    loader.load("second", { formId: "contact" });
    loader.unloadAll();

    expect(ledger.slice(2)).toEqual(["destroy:second", "destroy:first"]);
    expect(loader.loadedIds()).toEqual([]);
  });

  describe("dependencies", () => {
    it("loads required modules first", () => {
      const ledger: string[] = [];
      const loader = new ModuleLoader<iTestContext, iTestInstance>("form", [
        createDefinition("cascade", ledger),
        createDefinition("validation", ledger, { requires: ["cascade"] }),
      ]);

      loader.load("validation", { formId: "contact" });

      expect(ledger).toEqual(["load:cascade", "load:validation"]);
    });

    it("throws MISSING_DEPENDENCY when a requirement is not registered", () => {
      const loader = new ModuleLoader<iTestContext, iTestInstance>("form", [
        createDefinition("validation", [], { requires: ["cascade"] }),
      ]);

      try {
        loader.load("validation", { formId: "contact" });
        throw new Error("expected a RegistryError");
      } catch (error) {
        expect(error).toBeInstanceOf(RegistryError);
        expect((error as RegistryError).code).toBe("MISSING_DEPENDENCY");
      }
    });

    it("throws CYCLIC_DEPENDENCY when requirements loop", () => {
      const loader = new ModuleLoader<iTestContext, iTestInstance>("form", [
        createDefinition("a", [], { requires: ["b"] }),
        createDefinition("b", [], { requires: ["a"] }),
      ]);

      try {
        loader.load("a", { formId: "contact" });
        throw new Error("expected a RegistryError");
      } catch (error) {
        expect(error).toBeInstanceOf(RegistryError);
        expect((error as RegistryError).code).toBe("CYCLIC_DEPENDENCY");
      }
    });
  });

  describe("resolveAll", () => {
    it("loads every module whose matches predicate accepts the context", () => {
      const ledger: string[] = [];
      const loader = new ModuleLoader<iTestContext, iTestInstance>("form", [
        createDefinition("always", ledger),
        createDefinition("contactOnly", ledger, {
          matches: (context) => context.formId === "contact",
        }),
      ]);

      const loaded = loader.resolveAll({ formId: "contact" });

      expect(loaded.map((instance) => instance.id)).toEqual(["always", "contactOnly"]);
      expect(loader.loadedIds()).toEqual(["always", "contactOnly"]);
    });

    it("skips modules whose matches predicate rejects the context", () => {
      const ledger: string[] = [];
      const loader = new ModuleLoader<iTestContext, iTestInstance>("form", [
        createDefinition("contactOnly", ledger, {
          matches: (context) => context.formId === "contact",
        }),
      ]);

      expect(loader.resolveAll({ formId: "archive" })).toEqual([]);
      expect(ledger).toEqual([]);
    });
  });
});
