import { describe, expect, it } from "vitest";
import {
  aiResponseSchema,
  assemblePreset,
  assertAiContent,
  parseAiContent,
} from "./ai.ts";
import type { iAiSiteContent, PresetAssembly } from "./ai.ts";
import { assertPreset, parsePreset } from "./parse.ts";
import { plan } from "./plan.ts";

const base: PresetAssembly = {
  id: "kriya",
  engine: { range: "^0.1.0", resolved: "0.1.3" },
  model: "gallery",
  theme: "default",
  site: { name: "Kriya Nusantara", locale: "id" },
  answers: { webType: "gallery" },
  generatedAt: "2026-11-10T00:00:00.000Z",
};

const minimal: iAiSiteContent = {
  contentSchema: 1,
  pages: [
    { id: "home", route: "/", content: { "section#hero": { content: "Halo" } } },
  ],
};

describe("parseAiContent", () => {
  it("accepts the minimal envelope", () => {
    const result = parseAiContent(minimal);
    expect(result.issues).toEqual([]);
    expect(result.pages).toHaveLength(1);
    expect(result.notes).toEqual([]);
  });

  it("rejects a wrong contentSchema", () => {
    const result = parseAiContent({ ...minimal, contentSchema: 2 });
    expect(result.issues[0].code).toBe("INVALID_SHAPE");
  });

  it("rejects a non-object response", () => {
    expect(parseAiContent("halo").issues[0].code).toBe("INVALID_SHAPE");
  });

  it("applies the same page rules as the preset parser", () => {
    const duplicate = parseAiContent({
      contentSchema: 1,
      pages: [
        { id: "a", route: "/x", content: "x" },
        { id: "b", route: "/x", content: "y" },
      ],
    });
    expect(duplicate.issues.map((issue) => issue.code)).toContain("DUPLICATE_ROUTE");

    const unknownBuilder = parseAiContent({
      contentSchema: 1,
      pages: [{ id: "home", route: "/", content: { x: { builder: "chart-3d", content: [] } } }],
    });
    expect(unknownBuilder.issues[0].code).toBe("UNKNOWN_BUILDER");
  });

  it("keeps only string notes", () => {
    const result = parseAiContent({ ...minimal, notes: ["asumsi", 42, "", null] });
    expect(result.notes).toEqual(["asumsi"]);
  });

  it("sanitises SEO fields", () => {
    const result = parseAiContent({
      ...minimal,
      site: {
        tagline: "Tenun tangan",
        seo: { title: "Tenun Lestari", description: "", keywords: ["tenun", 7] },
      },
    });

    expect(result.site).toEqual({ tagline: "Tenun tangan", seo: { title: "Tenun Lestari", keywords: ["tenun"] } });
  });
});

describe("assemblePreset", () => {
  it("produces a document the preset parser accepts", () => {
    const ai = assertAiContent(minimal);
    const preset = assemblePreset(ai, base);

    expect(parsePreset(preset).issues).toEqual([]);
    expect(assertPreset(preset).id).toBe("kriya");
  });

  it("keeps the orchestrator's model and theme even if the AI disagrees", () => {
    const ai = assertAiContent({ ...minimal, model: "store", theme: "cyberpunk" });
    const preset = assemblePreset(ai, base);

    expect(preset.model).toBe("gallery");
    expect(preset.theme).toBe("default");
  });

  it("carries data sources the orchestrator created", () => {
    const ai = assertAiContent(minimal);
    const preset = assemblePreset(ai, {
      ...base,
      model: "store",
      data: [{ id: "products", sheet: "products", endpoint: "https://script/exec" }],
    });

    expect(plan(preset).capabilities).toContain("http-service");
  });

  it("is deterministic for the same inputs", () => {
    const ai = assertAiContent(minimal);
    expect(assemblePreset(ai, base)).toEqual(assemblePreset(ai, base));
  });

  it("throws from assertAiContent on bad output", () => {
    expect(() => assertAiContent({ ...minimal, contentSchema: 3 })).toThrow(/Invalid AI content/);
  });
});

describe("aiResponseSchema", () => {
  it("requires the schema version and pages", () => {
    const schema = aiResponseSchema() as { required: string[] };
    expect(schema.required).toEqual(expect.arrayContaining(["contentSchema", "pages"]));
  });
});
