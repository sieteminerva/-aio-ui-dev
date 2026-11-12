// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";

import { TableBuilder } from "../Table";

/**
 * The data object is `{ header, body, footer }`; rows are arrays in header order. Numbering and
 * row actions are off in these tests so the shape stays comparable to the payload.
 */

const data = {
  header: ["A", "B"],
  body: [
    ["1", "2"],
    ["3", "4"],
  ],
};

function build(payload: any = data, config: Record<string, any> = {}): HTMLElement {
  return new TableBuilder().create(payload, { autoNumbering: false, editable: false, ...config }) as HTMLElement;
}

describe("table", () => {
  it("renders the container and a table with the declared headers", () => {
    const root = build();
    const headers = Array.from(root.querySelectorAll("table.table thead th")).map((el) => el.textContent);

    expect(root.classList.contains("table-container")).toBe(true);
    expect(headers).toEqual(["A", "B"]);
  });

  it("renders one row per body array in header order", () => {
    const root = build();
    const rows = root.querySelectorAll("tbody tr");

    expect(rows).toHaveLength(2);
    const cells = Array.from(rows[0].querySelectorAll("td")).map((el) => el.textContent);
    expect(cells).toEqual(["1", "2"]);
  });

  it("treats a missing header or body as empty instead of throwing", () => {
    const root = build({});

    expect(root.querySelectorAll("thead th")).toHaveLength(0);
    expect(root.querySelectorAll("tbody tr")).toHaveLength(0);
  });

  it("renders pagination in the footer", () => {
    const root = build();

    expect(root.querySelector("tfoot .pagination")).not.toBeNull();
    expect(root.querySelector("tfoot .pagination .item.next")).not.toBeNull();
  });
});
