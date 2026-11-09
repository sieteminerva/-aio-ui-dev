// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from "vitest";

import { INPUT_MODULE_IDS } from "@aio-ui/input/InputRegistry";
import type { iInputAdapter } from "@aio-ui/input/InputModuleTypes";

import { FormBuilder } from "../Form";
import { FORM_ADAPTER_DEFINITIONS, FORM_ADAPTER_IDS, FORM_ADAPTER_MANIFEST } from "../FormRegistry";

/**
 * A form nests another builder, so one manifest carries two layers of modules: the form's
 * own adapters, and the input sub-modules that only `@aio-ui/input` knows how to mount.
 *
 * Two things have to hold, and both used to fail silently:
 *
 * - the manifest and the definitions describe the same stack (a drift here means the
 *   registry resolves one set while `new FormBuilder()` defaults to another);
 * - `scope: "input"` entries actually reach the fields — before this, `renderField()`
 *   built its `InputBuilder` with no `modules` at all, so every field fell back to
 *   `CORE_INPUT_MODULES` and a host could never trim the input layer.
 */

beforeEach(() => {
  document.body.replaceChildren();
});

/** Minimal adapter that proves it was used: it owns a marker type. */
function markerAdapter(): iInputAdapter & { seen: string[] } {
  const seen: string[] = [];
  return {
    seen,
    renderControl: (field) => {
      if (field.type !== "text") return null;
      seen.push(String(field.id));
      const el = document.createElement("input");
      el.type = "text";
      el.id = String(field.id);
      el.dataset.marker = "inherited";
      return el;
    },
  };
}

describe("form adapter manifest", () => {
  it("declares exactly the adapters the definitions provide", () => {
    const formScoped = FORM_ADAPTER_MANIFEST.filter((ref) => (ref.scope ?? "form") === "form").map((ref) => ref.id);

    expect(formScoped).toEqual(FORM_ADAPTER_IDS);
    expect(new Set(FORM_ADAPTER_IDS).size).toBe(FORM_ADAPTER_IDS.length);
  });

  it("marks every input sub-module as input-scoped, and nothing else", () => {
    const inputScoped = FORM_ADAPTER_MANIFEST.filter((ref) => ref.scope === "input").map((ref) => ref.id);

    expect(inputScoped.sort()).toEqual(Object.values(INPUT_MODULE_IDS).sort());
    // Every input-scoped entry must point at the input package, not at the form.
    for (const ref of FORM_ADAPTER_MANIFEST.filter((r) => r.scope === "input")) {
      expect(ref.path?.startsWith("@aio-ui/input/"), `${ref.id} → ${ref.path}`).toBe(true);
    }
  });

  it("keeps the definition list free of input modules", () => {
    const inputIds = new Set<string>(Object.values(INPUT_MODULE_IDS));
    const leaked = FORM_ADAPTER_DEFINITIONS.filter((definition) => inputIds.has(String(definition.id)));

    expect(leaked).toEqual([]);
  });
});

describe("Form.provideModules", () => {
  it("hands input-scoped modules to the fields instead of letting them default", () => {
    const adapter = markerAdapter();
    const form = new FormBuilder();
    form.provideModules({ [INPUT_MODULE_IDS.dropdown]: adapter });

    const el = form.create([{ type: "text", id: "inherited-field", title: "Field" }] as any) as HTMLElement;
    document.body.appendChild(el);

    const input = el.querySelector<HTMLInputElement>("#inherited-field");
    expect(adapter.seen).toEqual(["inherited-field"]);
    expect(input?.dataset.marker).toBe("inherited");
  });

  it("leaves fields on the default preset when no input module was provided", () => {
    const form = new FormBuilder();

    const el = form.create([{ type: "text", id: "default-field", title: "Field" }] as any) as HTMLElement;
    document.body.appendChild(el);

    const input = el.querySelector<HTMLInputElement>("#default-field");
    expect(input).not.toBeNull();
    expect(input?.dataset.marker).toBeUndefined();
  });
});
