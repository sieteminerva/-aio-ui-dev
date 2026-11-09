import { describe, expect, it } from "vitest";

import { DEFAULT_SELECTORS, ELEMENT_KEYS } from "../Badge.kit";
import { normalizePayload } from "../Badge.engine";

/**
 * Component tests stay DOM-free on purpose (the suite runs in `environment: "node"`).
 * They lock the two things that silently break a component:
 *
 *   1. the payload contract (which shapes are accepted), and
 *   2. the selector/key correspondence (a key without a selector throws at render time).
 */

describe("Badge payload", () => {
  it("accepts a bare array", () => {
    expect(normalizePayload([{ label: "a" }, { label: "b" }])).toHaveLength(2);
  });

  it("accepts { items } and { content }", () => {
    expect(normalizePayload({ items: [{ label: "a" }] })).toHaveLength(1);
    expect(normalizePayload({ content: [{ label: "a" }, { label: "b" }] })).toHaveLength(2);
  });

  it("treats a single record as one item", () => {
    expect(normalizePayload({ label: "only", description: "one" })).toHaveLength(1);
  });

  it("returns an empty list for nothing", () => {
    expect(normalizePayload(null)).toEqual([]);
    expect(normalizePayload(undefined)).toEqual([]);
    expect(normalizePayload({})).toEqual([]);
  });
});

describe("Badge contract", () => {
  it("declares a selector for every element key", () => {
    expect(Object.keys(DEFAULT_SELECTORS).sort()).toEqual([...ELEMENT_KEYS].sort());
  });

  it("gives every key a tag and a class", () => {
    for (const key of ELEMENT_KEYS) {
      expect(DEFAULT_SELECTORS[key].tagName, key).toBeTruthy();
      expect(DEFAULT_SELECTORS[key].className, key).toBeTruthy();
    }
  });
});
