// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";

import { FormBuilder } from "../Form";

/**
 * Everything `iFormConfig` declares must reach the DOM. These are the keys that used to be
 * accepted by the type and then silently ignored (`title`, `description`, `name`), plus the
 * two that were applied by string concatenation and could double up.
 */
const schema = [{ id: "g", title: "Grup", group: [{ type: "text", id: "name", title: "Nama" }] }];

function build(config: Record<string, any>): HTMLFormElement {
  return new FormBuilder().create(schema as any, config as any) as HTMLFormElement;
}

describe("form header", () => {
  it("renders the title and description above the first group", () => {
    const form = build({ title: "Pesanan baru", description: "Isi data pengiriman" });

    expect(form.querySelector("h2.title")?.textContent).toBe("Pesanan baru");
    expect(form.querySelector("p.desc")?.textContent).toBe("Isi data pengiriman");
    // the heading comes before the fieldset
    expect(form.firstElementChild?.tagName).toBe("H2");
  });

  it("renders nothing extra when the config omits them", () => {
    const form = build({});

    expect(form.querySelector("h2.title")).toBeNull();
    expect(form.querySelector(":scope > p.desc")).toBeNull();
  });
});

describe("form identity", () => {
  it("sets the form name", () => {
    expect(build({ name: "order-form" }).getAttribute("name")).toBe("order-form");
  });

  it("derives the id from config.id", () => {
    expect(build({ id: "demo order" }).id).toBe("form-demo-order");
  });

  it("accepts several class tokens without doubling them", () => {
    const form = build({ className: "stacked  bordered" });

    expect(form.classList.contains("stacked")).toBe(true);
    expect(form.classList.contains("bordered")).toBe(true);
    expect(form.className).not.toMatch(/stacked\s+stacked/);
    expect(form.className).not.toMatch(/\s{2,}/);
  });

  it("marks a multistep form on the element", () => {
    expect(build({ multistep: true }).classList.contains("multistep")).toBe(true);
    expect(build({}).classList.contains("multistep")).toBe(false);
  });

  it("keeps method and action", () => {
    const form = build({ method: "get", action: "/submit" });

    expect(form.method).toBe("get");
    expect(form.getAttribute("action")).toBe("/submit");
  });
});
