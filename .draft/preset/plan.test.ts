import { describe, expect, it } from "vitest";
import { galleryPreset, storePreset } from "./fixtures.ts";
import { assetsOf, plan } from "./plan.ts";
import type { iWebPreset } from "./types.ts";

/** Specifier lookup helper: `has(plan, "@aio-ui/form")`. */
function specifiers(assets: { specifier: string }[]): string[] {
  return assets.map((asset) => asset.specifier);
}

function stylesOf(preset: iWebPreset, specifier: string): string[] {
  const asset = assetsOf(preset).find((entry) => entry.specifier === specifier);
  return asset ? asset.styles : [];
}

describe("plan — base layer", () => {
  it("always ships the renderer, registry, app shell, theme and global styles", () => {
    const result = plan(galleryPreset);
    expect(specifiers(result.assets)).toEqual(
      expect.arrayContaining([
        "@aio-ui/frameworks",
        "@aio-ui/core",
        "@aio-ui/base",
        "@aio-ui/app",
        "@aio-ui/router",
        "@aio-ui/theme",
        "@aio-ui/theme-default",
      ]),
    );
    expect(result.baseStyles).toEqual(["@aio-ui/styles/index.css"]);
  });

  it("resolves the theme package from the preset, and reports an unknown one", () => {
    expect(specifiers(plan(storePreset).assets)).toContain("@aio-ui/theme-cyberpunk");

    const broken: iWebPreset = { ...galleryPreset, theme: "neon" };
    const result = plan(broken);
    expect(result.issues.map((issue) => issue.detail)).toContain('Theme "neon" has no package.');
  });
});

describe("plan — static site stays static", () => {
  const result = plan(galleryPreset);

  it("loads no form, input or message package", () => {
    const list = specifiers(result.assets);
    expect(list).not.toContain("@aio-ui/form");
    expect(list).not.toContain("@aio-ui/input");
    expect(list).not.toContain("@aio-ui/message");
  });

  it("adds the components the pages use", () => {
    const list = specifiers(result.assets);
    expect(list).toContain("@aio-ui/masonry");
    expect(list).toContain("@aio-ui/carousel");
  });

  it("detects animation in attrs and in raw HTML", () => {
    expect(result.capabilities).toContain("animations");
    expect(specifiers(result.assets)).toContain("@aio-ui/animations");
  });

  it("keeps the http service out of a single-page static site", () => {
    // The router is part of the base set: AioApp renders a page through it.
    expect(result.capabilities).not.toContain("http-service");
  });
});

describe("plan — store pulls in what it declares", () => {
  const result = plan(storePreset);
  const list = specifiers(result.assets);

  it("adds http service because the preset has data", () => {
    // Router is always present (base set); the data module is the conditional one.
    expect(result.capabilities).toContain("router");
    expect(result.capabilities).toContain("http-service");
    expect(list).toContain("@aio-ui/router");
    expect(list).toContain("@aio-ui/http-service");
  });

  it("adds form, input and the always-on submit path", () => {
    expect(list).toContain("@aio-ui/form");
    expect(list).toContain("@aio-ui/input");
    expect(list).toContain("@aio-ui/form/validation-adapter");
    expect(list).toContain("@aio-ui/form/Input.FormAdapter");
    expect(list).toContain("@aio-ui/message");
    expect(list).toContain("@aio-ui/message/adapters/FormAdapter");
  });

  it("turns config flags into adapters", () => {
    expect(list).toContain("@aio-ui/form/multistep-adapter");
    expect(list).toContain("@aio-ui/form/cascade-adapter");
    expect(list).toContain("@aio-ui/form/calculation-adapter");
  });

  it("turns field types and config into input modules", () => {
    expect(list).toContain("@aio-ui/input/dropdown/module");
    expect(list).toContain("@aio-ui/input/file-uploader/module");
    expect(list).toContain("@aio-ui/input/popover/module");
    expect(list).toContain("@aio-ui/input/controls/module");
  });

  it("adds the table bridge and the address capability", () => {
    expect(list).toContain("@aio-ui/table");
    expect(list).toContain("@aio-ui/table/adapters/FormAdapter");
    expect(list).toContain("@aio-ui/id-address/form");
  });

  it("attaches a package's stylesheets to its own module entry", () => {
    expect(stylesOf(storePreset, "@aio-ui/form")).toEqual(["@aio-ui/form/Form.css"]);
    expect(stylesOf(storePreset, "@aio-ui/input")).toEqual(["@aio-ui/input/input.css"]);
    expect(stylesOf(storePreset, "@aio-ui/input/dropdown/module")).toEqual(["@aio-ui/input/dropdown.css"]);
  });
});

describe("plan — validation", () => {
  it("reports builder words nobody can render instead of emitting a broken site", () => {
    const preset: iWebPreset = {
      ...galleryPreset,
      pages: [{ id: "home", route: "/", content: { x: { builder: "chart-3d", content: [] } } }],
    };

    const result = plan(preset);
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0].code).toBe("UNKNOWN_BUILDER");
    expect(result.issues[0].where).toContain("pages[0]");
  });

  it("flags registry-only builders (declared in the AST, no package)", () => {
    const preset: iWebPreset = {
      ...galleryPreset,
      pages: [{ id: "home", route: "/", content: { x: { builder: "editor", content: [] } } }],
    };

    const result = plan(preset);
    expect(result.issues[0].detail).toContain("no package implements it");
  });

  it("flags duplicate routes", () => {
    const preset: iWebPreset = {
      ...galleryPreset,
      pages: [
        { id: "a", route: "/produk", content: {} },
        { id: "b", route: "/produk", content: {} },
      ],
    };

    expect(plan(preset).issues.map((issue) => issue.code)).toContain("DUPLICATE_ROUTE");
  });
});

describe("plan — determinism", () => {
  it("returns identical, sorted output for the same preset", () => {
    const first = plan(storePreset);
    const second = plan(storePreset);
    expect(first).toEqual(second);

    // Same comparator as the implementation: locale order, not code units.
    const list = first.assets.map((asset) => asset.specifier);
    expect(list).toEqual([...list].sort((a, b) => a.localeCompare(b)));
  });

  it("assetsOf is exactly the plan's asset list", () => {
    expect(assetsOf(storePreset)).toEqual(plan(storePreset).assets);
  });
});
