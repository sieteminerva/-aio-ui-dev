import { describe, expect, it } from "vitest";

import { DEFAULT_ROW_COLUMNS, MAX_ROW_COLUMNS, childSpanOf, columnsOf, spanOf } from "../FormLayout";

/**
 * Row arithmetic, without a DOM: the numbers decide the grid, so they are the part worth
 * pinning down first. `wide` accepts three spellings because a sheet schema writes
 * whatever the author typed.
 */
describe("columnsOf", () => {
  it("defaults to two columns", () => {
    expect(columnsOf(undefined)).toBe(DEFAULT_ROW_COLUMNS);
    expect(columnsOf(null)).toBe(DEFAULT_ROW_COLUMNS);
    expect(columnsOf("abc")).toBe(DEFAULT_ROW_COLUMNS);
  });

  it("rounds and clamps into a usable range", () => {
    expect(columnsOf(3)).toBe(3);
    expect(columnsOf("4")).toBe(4);
    expect(columnsOf(0)).toBe(1);
    expect(columnsOf(-2)).toBe(1);
    expect(columnsOf(99)).toBe(MAX_ROW_COLUMNS);
    expect(columnsOf(2.4)).toBe(2);
  });
});

describe("spanOf", () => {
  it("treats a number as a percentage of the row", () => {
    expect(spanOf(50, 2)).toBe(1);
    expect(spanOf(33, 3)).toBe(1);
    expect(spanOf(66, 3)).toBe(2);
    expect(spanOf(25, 4)).toBe(1);
  });

  it("treats a fraction as a share of the row", () => {
    expect(spanOf(0.5, 2)).toBe(1);
    expect(spanOf(1, 4)).toBe(4);
  });

  it('gives "auto" the whole row', () => {
    expect(spanOf("auto", 2)).toBe(2);
    expect(spanOf("auto", 5)).toBe(5);
  });

  it("falls back to one column and never exceeds the row", () => {
    expect(spanOf(undefined, 3)).toBe(1);
    expect(spanOf("abc", 3)).toBe(1);
    expect(spanOf(0, 3)).toBe(1);
    expect(spanOf(300, 3)).toBe(3);
  });
});

describe("childSpanOf", () => {
  it("reads wide from config first, then from the node", () => {
    expect(childSpanOf({ config: { wide: 50 } }, 2)).toBe(1);
    expect(childSpanOf({ wide: "auto" }, 3)).toBe(3);
  });

  it("lets an explicit span win over wide", () => {
    expect(childSpanOf({ span: 2, config: { wide: 50 } }, 2)).toBe(2);
  });

  it("returns one column for a child that says nothing", () => {
    expect(childSpanOf({ type: "text" }, 3)).toBe(1);
    expect(childSpanOf("raw html", 3)).toBe(1);
  });
});
