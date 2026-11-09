import { describe, expect, it } from "vitest";

import { DEFAULT_SELECTORS, ELEMENT_KEYS } from "../ProductDetail.kit";
import { formatPrice, imageOf, normalizeProduct } from "../ProductDetail.engine";
import { normalizeProducts } from "../ProductGrid.engine";

describe("product detail payload", () => {
  it("reads a record as-is and unwraps { content }", () => {
    expect(normalizeProduct({ title: "A" }).title).toBe("A");
    expect(normalizeProduct({ content: { title: "B" } }).title).toBe("B");
  });

  it("returns an empty record for nothing", () => {
    expect(normalizeProduct(null)).toEqual({});
    expect(normalizeProduct(undefined)).toEqual({});
  });

  it("prefers per-colour artwork, then the product artwork", () => {
    const record = { artwork: { src: "apparel/base.png" } };
    expect(imageOf(record)).toBe("apparel/base.png");
    expect(imageOf(record, { src: "apparel/black.png" })).toBe("apparel/black.png");
  });

  it("formats numbers and passes strings through", () => {
    expect(formatPrice(85000)).toBe("Rp 85.000");
    expect(formatPrice("Rp 1.200.000")).toBe("Rp 1.200.000");
    expect(formatPrice(undefined)).toBe("");
  });
});

describe("product detail contract", () => {
  it("declares a selector for every element key", () => {
    expect(Object.keys(DEFAULT_SELECTORS).sort()).toEqual([...ELEMENT_KEYS].sort());
  });
});

describe("product grid payload", () => {
  it("accepts every documented list shape", () => {
    expect(normalizeProducts({ content: { data: [{ uid: "1" }] } })).toHaveLength(1);
    expect(normalizeProducts({ content: [{ uid: "1" }] })).toHaveLength(1);
    expect(normalizeProducts([{ uid: "1" }, { uid: "2" }])).toHaveLength(2);
    expect(normalizeProducts({ data: [{ uid: "1" }] })).toHaveLength(1);
    expect(normalizeProducts({})).toEqual([]);
  });
});
