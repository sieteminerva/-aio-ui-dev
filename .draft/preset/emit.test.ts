import { describe, expect, it } from "vitest";
import { createCdnResolver, emitPlan, emitSite } from "./emit.ts";
import type { AssetResolver, PackageLayout } from "./emit.ts";
import { galleryPreset, storePreset } from "./fixtures.ts";
import { plan } from "./plan.ts";

/** Deterministic fake: URL is the specifier with separators replaced. */
const fakeResolver: AssetResolver = {
  module: (specifier) => `https://cdn.test/mods/${specifier.replace(/[@/]/g, "_")}`,
  style: (specifier) => `https://cdn.test/styles/${specifier.replace(/[@/]/g, "_")}`,
  prefixes: () => ({ "@aio-ui/utilities/": "https://cdn.test/mods/utilities/" }),
};

describe("emitPlan", () => {
  it("maps every planned module and links every planned stylesheet", () => {
    const emitted = emitSite(storePreset, fakeResolver);
    const modules = plan(storePreset).modules;

    // Exact mappings for what the app imports, plus prefix mappings so a
    // component's own imports resolve in the browser.
    expect(Object.keys(emitted.importMap.imports)).toEqual(expect.arrayContaining([...modules]));
    expect(emitted.missing).toEqual([]);

    // Base stylesheet first, then component sheets, no duplicates.
    expect(emitted.links[0]).toContain("_aio-ui_styles_index.css");
    expect(emitted.links.length).toBe(new Set(emitted.links).size);
  });

  it("emits prefix mappings for package subpaths", () => {
    const emitted = emitSite(galleryPreset, fakeResolver);
    expect(Object.keys(emitted.importMap.imports)).toContain("@aio-ui/utilities/");
  });

  it("keeps the import map keys sorted so the file is diff-free", () => {
    const keys = Object.keys(emitSite(storePreset, fakeResolver).importMap.imports);
    expect(keys).toEqual([...keys].sort((a, b) => a.localeCompare(b)));
  });

  it("attaches styles to the module they belong to", () => {
    const emitted = emitSite(storePreset, fakeResolver);
    const form = emitted.table.find((row) => row.specifier === "@aio-ui/form/Form");

    expect(form?.styles).toEqual(["https://cdn.test/styles/_aio-ui_form_Form.css"]);
  });

  it("reports specifiers the resolver cannot place", () => {
    const partial: AssetResolver = {
      module: (specifier) => (specifier === "@aio-ui/router" ? null : fakeResolver.module(specifier)),
      style: fakeResolver.style,
    };
    const emitted = emitSite(storePreset, partial);
    expect(emitted.missing).toContain("@aio-ui/router");
    expect(emitted.importMap.imports["@aio-ui/router"]).toBeUndefined();
  });

  it("emits a static site without form, input or message assets", () => {
    const emitted = emitSite(galleryPreset, fakeResolver);
    const keys = Object.keys(emitted.importMap.imports).join(" ");
    expect(keys).not.toContain("@aio-ui/form/Form");
    expect(keys).not.toContain("@aio-ui/input/Input");
    expect(keys).not.toContain("@aio-ui/message/Message");
  });

  it("does not duplicate a shared stylesheet", () => {
    const emitted = emitPlan(plan(storePreset), fakeResolver);
    expect(emitted.links.length).toBe(new Set(emitted.links).size);
  });
});

describe("createCdnResolver", () => {
  const layout: PackageLayout = {
    "@aio-ui/form": { dir: "packages/components/form", entry: "dist/Form.js" },
    "@aio-ui/input": { dir: "packages/components/input", entry: "dist/Input.js" },
  };
  const resolver = createCdnResolver({ base: "https://cdn.jsdelivr.net/gh/u/r@v0.1.3/", layout });

  it("resolves the bare specifier to the package entry", () => {
    expect(resolver.module("@aio-ui/form")).toBe(
      "https://cdn.jsdelivr.net/gh/u/r@v0.1.3/packages/components/form/dist/Form.js",
    );
  });

  it("mirrors subpaths into dist/", () => {
    expect(resolver.module("@aio-ui/input/dropdown/module")).toBe(
      "https://cdn.jsdelivr.net/gh/u/r@v0.1.3/packages/components/input/dist/dropdown/module.js",
    );
  });

  it("places stylesheets next to the compiled JS", () => {
    expect(resolver.style("@aio-ui/form/Form.css")).toBe(
      "https://cdn.jsdelivr.net/gh/u/r@v0.1.3/packages/components/form/dist/Form.css",
    );
  });

  it("returns null for a package outside the layout", () => {
    expect(resolver.module("@aio-ui/router")).toBeNull();
    expect(resolver.style("@aio-ui/router/Router.css")).toBeNull();
  });

  it("appends the missing slash to the base", () => {
    const noSlash = createCdnResolver({ base: "https://cdn.test", layout });
    expect(noSlash.module("@aio-ui/form")).toBe("https://cdn.test/packages/components/form/dist/Form.js");
  });
});
