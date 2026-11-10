import { describe, expect, it } from "vitest";
import { galleryPreset, storePreset } from "./fixtures.ts";
import { assertPreset, parsePreset, PresetValidationError } from "./parse.ts";

describe("parsePreset — accepts real presets", () => {
  it("passes both fixtures with no issues", () => {
    expect(parsePreset(galleryPreset).issues).toEqual([]);
    expect(parsePreset(storePreset).issues).toEqual([]);
  });

  it("normalises a minimal document", () => {
    const { preset } = parsePreset({
      id: "site",
      presetSchema: 1,
      engine: { range: "^0.1.0", resolved: "0.1.0" },
      model: "blog",
      theme: "default",
      site: { name: "Blog" },
      pages: [{ id: "home", route: "/", content: "Halo" }],
      wizard: { answers: {}, generatedAt: "2026-11-10T00:00:00.000Z" },
    });

    expect(preset.site.locale).toBe("id");
    expect(preset.data).toBeUndefined();
  });
});

describe("parsePreset — shape", () => {
  it("rejects a non-object document", () => {
    const { issues } = parsePreset("<html>");
    expect(issues[0].code).toBe("INVALID_SHAPE");
  });

  it("rejects a wrong schema version", () => {
    const { issues } = parsePreset({ ...galleryPreset, presetSchema: 2 });
    expect(issues.map((issue) => issue.code)).toContain("INVALID_SHAPE");
  });

  it("rejects an unknown model", () => {
    const { issues } = parsePreset({ ...galleryPreset, model: "portal" });
    expect(issues.map((issue) => issue.code)).toContain("UNKNOWN_MODEL");
  });

  it("rejects an unknown theme", () => {
    const { issues } = parsePreset({ ...galleryPreset, theme: "neon" });
    expect(issues.map((issue) => issue.code)).toContain("UNKNOWN_THEME");
  });

  it("reports a page without an id", () => {
    const { issues } = parsePreset({
      ...galleryPreset,
      pages: [{ route: "/", content: "x" }],
    });
    expect(issues.map((issue) => issue.code)).toContain("MISSING_PAGE_ID");
  });

  it("reports a route that does not start with a slash", () => {
    const { issues } = parsePreset({
      ...galleryPreset,
      pages: [{ id: "home", route: "home", content: "x" }],
    });
    expect(issues.map((issue) => issue.code)).toContain("INVALID_SHAPE");
  });

  it("reports duplicate routes", () => {
    const { issues } = parsePreset({
      ...galleryPreset,
      pages: [
        { id: "a", route: "/x", content: "x" },
        { id: "b", route: "/x", content: "y" },
      ],
    });
    expect(issues.map((issue) => issue.code)).toContain("DUPLICATE_ROUTE");
  });

  it("rejects a builder word used as the host key", () => {
    const { issues } = parsePreset({
      ...galleryPreset,
      pages: [{ id: "home", route: "/", content: { masonry: { builder: "masonry", content: [] } } }],
    });
    expect(issues.map((issue) => issue.code)).toContain("INVALID_SHAPE");
    expect(issues.map((issue) => issue.detail).join(" ")).toMatch(/repeats the builder name/);
  });
});

describe("parsePreset — closed vocabulary", () => {
  it("rejects a builder nobody can render", () => {
    const { issues } = parsePreset({
      ...galleryPreset,
      pages: [{ id: "home", route: "/", content: { x: { builder: "chart-3d", content: [] } } }],
    });
    expect(issues[0].code).toBe("UNKNOWN_BUILDER");
  });

  it("rejects registry-only builders", () => {
    const { issues } = parsePreset({
      ...galleryPreset,
      pages: [{ id: "home", route: "/", content: { x: { builder: "form-editor", content: [] } } }],
    });
    expect(issues[0].detail).toContain("no package implements it");
  });

  it("reports the same unknown builder once, not once per page", () => {
    const bad = { x: { builder: "chart-3d", content: [] } };
    const { issues } = parsePreset({
      ...galleryPreset,
      pages: [
        { id: "a", route: "/a", content: bad },
        { id: "b", route: "/b", content: bad },
      ],
    });
    expect(issues).toHaveLength(1);
  });

  it("rejects a field type the input layer does not support", () => {
    const { issues } = parsePreset({
      ...galleryPreset,
      pages: [
        {
          id: "home",
          route: "/",
          content: {
            "div#form": {
              builder: "form",
              content: { config: { id: "f" }, schema: [{ type: "search", id: "q", label: "Cari" }] },
            },
          },
        },
      ],
    });
    expect(issues[0].code).toBe("UNSUPPORTED_FIELD");
    expect(issues[0].detail).toContain("search");
  });

  it("rejects a selector key that looks like a component name", () => {
    // The renderer turns "-" in a tag into a space: `product-card-grid` would
    // become the invalid tag "product card grid". Generated content must use
    // `div#id` + `builder` instead.
    const { issues } = parsePreset({
      ...galleryPreset,
      pages: [
        {
          id: "home",
          route: "/",
          content: { "product-card-grid": { builder: "product-card-grid", content: [] } },
        },
      ],
    });

    expect(issues[0].code).toBe("INVALID_SHAPE");
    expect(issues[0].detail).toContain('"div#product-card-grid"');
  });

  it("rejects a form node with no schema and no field array", () => {
    const { issues } = parsePreset({
      ...galleryPreset,
      pages: [{ id: "home", route: "/", content: { "div#form": { builder: "form", content: "hi" } } }],
    });
    expect(issues[0].code).toBe("FORM_SHAPE");
  });
});

describe("assertPreset", () => {
  it("returns the preset when clean", () => {
    expect(assertPreset(storePreset).id).toBe("tenun-lestari");
  });

  it("throws with the issue list", () => {
    expect(() => assertPreset({ ...galleryPreset, theme: "neon" })).toThrow(PresetValidationError);
  });
});
