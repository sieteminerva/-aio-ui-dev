// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";

import { FormBuilder } from "../Form";

/**
 * A row renders fields side by side — the schema is `{ label, column, row: [...] }`, and
 * the DOM it produces is what the CSS grid keys off. No `<fieldset>`, no `<legend>`: that
 * word stays reserved for `group`.
 */
function renderForm(schema: any[]): HTMLFormElement {
  return new FormBuilder().create(schema as any) as HTMLFormElement;
}

describe("form rows", () => {
  const schema = [
    {
      id: "identity",
      label: "Identitas",
      column: 2,
      row: [
        { type: "text", id: "first", title: "Nama depan", config: { wide: 50 } },
        { type: "text", id: "last", title: "Nama belakang", config: { wide: "50" } },
        { type: "textarea", id: "street", title: "Alamat", config: { wide: "auto" } },
      ],
    },
  ];

  it("renders a layout container, not a fieldset", () => {
    const row = renderForm(schema).querySelector(".field.group[data-column]") as HTMLElement;

    expect(row).not.toBeNull();
    expect(row.tagName).toBe("DIV");
    expect(row.querySelector("legend")).toBeNull();
    expect(row.classList.contains("group")).toBe(true);
    expect(row.classList.contains("row")).toBe(false);
  });

  it("declares its column count for the grid", () => {
    const row = renderForm(schema).querySelector(".field.group[data-column]") as HTMLElement;

    expect(row.dataset.column).toBe("2");
    expect(row.style.getPropertyValue("--items")).toBe("2");
  });

  it("renders the label as a heading that spans the row", () => {
    const row = renderForm(schema).querySelector(".field.group[data-column]") as HTMLElement;
    const title = row.querySelector(".title");

    expect(title?.textContent).toBe("Identitas");
  });

  it("applies each child's width as a column span", () => {
    const row = renderForm(schema).querySelector(".field.group[data-column]") as HTMLElement;
    const fields = [...row.querySelectorAll(":scope > .field")];

    expect(fields).toHaveLength(3);
    expect((fields[0] as HTMLElement).dataset.span).toBe("1");
    expect((fields[2] as HTMLElement).dataset.span).toBe("2");
    expect((fields[2] as HTMLElement).style.getPropertyValue("--span")).toBe("2");
  });

  it("keeps every field intact inside the row", () => {
    const row = renderForm(schema).querySelector(".field.group[data-column]") as HTMLElement;

    expect(row.querySelector("#first")).not.toBeNull();
    expect(row.querySelector('label[for="street"]')?.textContent).toBe("Alamat");
  });

  it("lets a row nest inside a row as a grid cell", () => {
    const nested = [
      {
        id: "outer",
        column: 2,
        row: [
          {
            column: 1,
            wide: 50,
            row: [
              { type: "text", id: "city", title: "Kota" },
              { type: "text", id: "zip", title: "Kode pos" },
            ],
          },
          { type: "text", id: "province", title: "Provinsi" },
        ],
      },
    ];
    const form = renderForm(nested);
    const outer = form.querySelector(".field.group[data-column]") as HTMLElement;
    const inner = outer.querySelector(":scope > .field.group[data-column]") as HTMLElement;

    expect(inner).not.toBeNull();
    expect(inner.dataset.column).toBe("1");
    expect(inner.dataset.span).toBe("1");
    expect(inner.querySelectorAll(":scope > .field")).toHaveLength(2);
    expect((outer.querySelector("#province") as HTMLElement).closest(".field")?.getAttribute("data-span")).toBe("1");
  });

  it("still lets a plain group render a fieldset", () => {
    const form = renderForm([{ id: "plain", title: "Biasa", group: [{ type: "text", id: "x", title: "X" }] }]);

    expect(form.querySelector("fieldset.form-group")).not.toBeNull();
    expect(form.querySelector(".field.group[data-column]")).toBeNull();
  });
});
