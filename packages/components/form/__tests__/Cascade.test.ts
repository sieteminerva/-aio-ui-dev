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

/**
 * A conditional item must follow its condition in **every** live instance, and a repeated
 * copy must be driven by its *own* inputs: the copy's controls are suffixed (`sku` →
 * `sku-1`), so the resolution is scoped to the instance that owns the condition.
 */
describe("cascade and a repeated scope", () => {
  const repeatable = [
    {
      id: "line",
      title: "Baris",
      actions: [{ type: "add", label: "Add", onClick: () => undefined }],
      group: [
        { type: "text", id: "sku", title: "SKU" },
        { type: "text", id: "note", title: "Catatan", condition: { field: "sku", filled: true } },
      ],
    },
  ];

  const render = (mode: "template" | "hidden") =>
    new FormBuilder().create(repeatable as any, { cascading: true, cascadeMode: mode } as any) as HTMLFormElement;

  const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

  for (const mode of ["hidden", "template"] as const) {
    it(`drives each copy from its own inputs (${mode})`, async () => {
      const form = render(mode);
      await tick();

      // No SKU yet: the note is held away — hidden in `hidden` mode, a placeholder in
      // `template` mode. Either way it is not a live element.
      const held = form.querySelector('[data-cascade]:not(template)') as HTMLElement | null;
      if (mode === "hidden") expect(held?.hidden).toBe(true);
      else expect(held).toBeNull();

      (form.querySelector("button.add") as HTMLButtonElement).click();
      await tick();

      const clone = form.querySelector("#line-1") as HTMLElement;
      const cloneSku = clone.querySelector("#sku-1") as HTMLInputElement;
      cloneSku.value = "ABC";
      cloneSku.dispatchEvent(new Event("input", { bubbles: true }));
      await tick();

      // The copy shows its note, built with the copy's own id…
      expect(clone.querySelector("#note-1")).not.toBeNull();
      const cloneNote = clone.querySelector('[data-cascade]:not(template)') as HTMLElement;
      expect(cloneNote.hidden).toBe(false);

      // …while the original still shows nothing: conditions do not leak across copies.
      const sourceItem = (form.querySelector("#line") as HTMLElement).querySelector("[data-cascade]");
      const sourceIsPlaceholder = sourceItem instanceof HTMLTemplateElement;
      expect(sourceIsPlaceholder || (sourceItem as HTMLElement).hidden).toBe(true);
    });
  }
});
