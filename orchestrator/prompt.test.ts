import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { BUILDER_CATALOGUE, UNIMPLEMENTED_BUILDERS } from "./catalogue.ts";

/**
 * The prompt is code: it declares the vocabulary the validator enforces. If the
 * catalogue grows and the prompt is not updated, the model is told to use a
 * word it cannot use — or worse, the reverse. This test keeps them in lockstep.
 */
const prompt = readFileSync(fileURLToPath(new URL("./prompt.content.md", import.meta.url)), "utf8");

/** Reads the `<!-- builders:begin -->…<!-- builders:end -->` block. */
function builderBlock(source: string): string[] {
  const match = source.match(/<!--\s*builders:begin\s*-->([\s\S]*?)<!--\s*builders:end\s*-->/);
  if (!match) return [];
  return match[1]
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "");
}

describe("prompt.content.md", () => {
  it("lists exactly the builders the catalogue can render", () => {
    expect(builderBlock(prompt).sort()).toEqual(Object.keys(BUILDER_CATALOGUE).sort());
  });

  it("never offers a registry-only builder", () => {
    const listed = new Set(builderBlock(prompt));
    UNIMPLEMENTED_BUILDERS.forEach((word) => {
      expect(listed.has(word)).toBe(false);
    });
  });

  it("documents the AI envelope version", () => {
    expect(prompt).toContain('"contentSchema": 1');
    expect(prompt).toContain("`contentSchema` **must be `1`**");
  });

  it("states the output is JSON only", () => {
    expect(prompt).toContain("one JSON object and nothing else");
  });

  it("lists every animation type the engine registers", () => {
    ["typewriter", "stagger-fade", "fade-in", "text-scramble", "count-up", "loading-placeholder"].forEach(
      (name) => expect(prompt).toContain(name),
    );
  });

  it("lists every field type the input layer supports", () => {
    ["text", "textarea", "number", "checkbox", "radio", "range", "date", "time", "datetime-local", "color", "email", "password", "url", "tel", "hidden", "select", "dropdown", "file", "actions"].forEach(
      (type) => expect(prompt).toContain(`\`${type}\``),
    );
  });
});
