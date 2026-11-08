// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";

import { FormBuilder } from "../Form";

/**
 * Cascade, both hold modes.
 *
 * `template` (default) builds a conditional item only while its condition holds.
 * `hidden` builds it immediately and toggles visibility — the mode a chained picker
 * needs, because its API has to inject options into an element that does not exist yet in
 * template mode. These tests are the first proof either mode runs in a real DOM.
 */
const schema = [
  {
    id: "company",
    title: "Perusahaan",
    group: [
      { type: "text", id: "brand", title: "Nama brand" },
      { type: "text", id: "address", title: "Alamat kantor", condition: { field: "brand", filled: true } },
    ],
  },
];

function build(mode: "template" | "hidden"): HTMLFormElement {
  return new FormBuilder().create(schema as any, { cascading: true, cascadeMode: mode } as any) as HTMLFormElement;
}

async function type(form: HTMLFormElement, id: string, value: string): Promise<void> {
  const input = form.querySelector(`#${id}`) as HTMLInputElement;
  input.value = value;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe("cascade in template mode", () => {
  it("keeps the conditional field out of the DOM until its condition holds", async () => {
    const form = build("template");

    expect(form.querySelector("#address")).toBeNull();
    expect(form.querySelector("template[data-cascade]")).not.toBeNull();

    await type(form, "brand", "Seribu");

    expect(form.querySelector("#address")).not.toBeNull();
  });

  it("takes the field back out when the condition stops holding", async () => {
    const form = build("template");
    await type(form, "brand", "Seribu");
    expect(form.querySelector("#address")).not.toBeNull();

    await type(form, "brand", "");

    expect(form.querySelector("#address")).toBeNull();
  });
});

describe("cascade in hidden mode", () => {
  it("builds the field up front and only hides it", () => {
    const form = build("hidden");
    const field = form.querySelector("#address") as HTMLInputElement;

    expect(field).not.toBeNull();
    expect(field.closest("[data-cascade]")?.hasAttribute("hidden")).toBe(true);
  });

  it("shows it when the condition holds and hides it again when it does not", async () => {
    const form = build("hidden");
    const holder = () => form.querySelector("#address")!.closest("[data-cascade]") as HTMLElement;

    await type(form, "brand", "Seribu");
    expect(holder().hasAttribute("hidden")).toBe(false);

    await type(form, "brand", "");
    expect(holder().hasAttribute("hidden")).toBe(true);
  });

  it("never rebuilds the element, so an injected option survives the toggle", async () => {
    const form = build("hidden");
    await type(form, "brand", "Seribu");

    // Simulate a chained picker injecting into the dependent select.
    const holder = form.querySelector("#address")!.closest("[data-cascade]") as HTMLElement;
    holder.dataset.marker = "kept";

    await type(form, "brand", "");
    await type(form, "brand", "Seribu");

    expect(form.querySelector("[data-cascade]")?.getAttribute("data-marker")).toBe("kept");
  });
});

describe("multistep gate", () => {
  const steps = [
    { id: "s1", title: "Satu", group: [{ type: "email", id: "m-email", title: "Email", required: true }] },
    { id: "s2", title: "Dua", group: [{ type: "text", id: "m-city", title: "Kota" }] },
  ];

  function buildSteps(): HTMLFormElement {
    return new FormBuilder().create(steps as any, { multistep: true } as any) as HTMLFormElement;
  }

  const active = (form: HTMLFormElement) =>
    form.querySelector<HTMLElement>("fieldset.active")?.id ?? null;

  it("stays on the step while a required field is empty", async () => {
    const form = buildSteps();

    form.querySelector<HTMLButtonElement>(".buttons.set button.next")!.click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(active(form)).toBe("s1");
  });

  it("advances once the step is valid", async () => {
    const form = buildSteps();
    (form.querySelector("#m-email") as HTMLInputElement).value = "budi@example.com";

    form.querySelector<HTMLButtonElement>(".buttons.set button.next")!.click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(active(form)).toBe("s2");
  });
});
