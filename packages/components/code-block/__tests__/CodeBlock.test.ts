import { describe, expect, it } from "vitest";

import { DEFAULT_SELECTORS, ELEMENT_KEYS, normalizePayload } from "../index";

/**
 * Component tests stay DOM-free on purpose (the suite runs in `environment: "node"`).
 * They lock the two things that silently break a component:
 *
 *   1. the payload contract (which shapes are accepted), and
 *   2. the selector/key correspondence (a key without a selector throws at render time).
 */

describe("Code Block payload", () => {
  it("accepts the canonical single block", () => {
    expect(normalizePayload({ code: "const a = 1;", label: "ts", language: "ts" })).toEqual([
      { code: "const a = 1;", label: "ts", language: "ts" },
    ]);
  });

  it("accepts { blocks: [...] } and a bare array", () => {
    expect(normalizePayload({ blocks: [{ code: "a" }, { code: "b" }] })).toHaveLength(2);
    expect(normalizePayload([{ code: "a" }])).toHaveLength(1);
  });

  it("accepts a bare string as source only", () => {
    expect(normalizePayload("npm run verify")).toEqual([{ code: "npm run verify" }]);
  });

  it("unwraps { content }", () => {
    expect(normalizePayload({ content: { code: "x" } })).toEqual([{ code: "x" }]);
  });

  it("returns an empty list for nothing usable", () => {
    expect(normalizePayload(null)).toEqual([]);
    expect(normalizePayload(undefined)).toEqual([]);
    expect(normalizePayload({})).toEqual([]);
    expect(normalizePayload({ label: "no code" })).toEqual([]);
    expect(normalizePayload(42)).toEqual([]);
  });
});

describe("Code Block contract", () => {
  it("declares a selector for every element key", () => {
    expect(Object.keys(DEFAULT_SELECTORS).sort()).toEqual([...ELEMENT_KEYS].sort());
  });

  it("gives every key a tag and a class", () => {
    for (const key of ELEMENT_KEYS) {
      expect(DEFAULT_SELECTORS[key].tagName, key).toBeTruthy();
      expect(DEFAULT_SELECTORS[key].className, key).toBeTruthy();
    }
  });

  it("renders the panel as a real pre with a code child", () => {
    expect(DEFAULT_SELECTORS["@container>figure>block"]).toEqual({ tagName: "pre", className: "code-block" });
    expect(DEFAULT_SELECTORS["@container>figure>block>source"]?.tagName).toBe("code");
  });
});
