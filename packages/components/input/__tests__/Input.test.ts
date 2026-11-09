// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";

import { InputBuilder } from "../Input";
import { InputAttributeBuilder } from "../Attribute";
import { INPUT_TYPE_REGISTRY, inputTypeOf, scanInputAttributes } from "../FieldTypes";
import { CORE_INPUT_MODULES, LITE_INPUT_MODULES } from "../InputRegistry";
import { ModuleLoader } from "@aio-ui/module-loader/ModuleLoader";

/**
 * First DOM-aware tests in the repo: a field is markup, so the contract can only be
 * pinned down by rendering it. Everything else here is the type matrix and the module set.
 */

function build(schema: Record<string, any>, config: Record<string, any> = {}): { container: HTMLElement; control: HTMLElement } {
  const container = new InputBuilder(config as any).create(schema as any) as HTMLElement;
  const control = container.querySelector("input, textarea, select") as HTMLElement;
  return { container, control };
}

describe("InputBuilder label", () => {
  it("renders the label once, bound to the control", () => {
    const { container, control } = build({ type: "text", id: "name", title: "Nama" });
    const labels = container.querySelectorAll("label");

    expect(labels).toHaveLength(1);
    expect(labels[0].textContent).toBe("Nama");
    expect(labels[0].getAttribute("for")).toBe(control.id);
  });

  it("renders one label for a checkbox (the second one was a duplicate)", () => {
    const { container } = build({ type: "checkbox", id: "agree", title: "Saya setuju" });

    expect(container.querySelectorAll("label")).toHaveLength(1);
  });

  it("defaults a toggle label to the right so it cannot sit on the switch", () => {
    const { container } = build({ type: "checkbox", id: "agree", title: "Saya setuju" });

    expect(container.querySelector("label")?.getAttribute("data-position")).toBe("right");
  });

  it("takes an explicit position from the field or from its config", () => {
    expect(build({ type: "checkbox", id: "a", title: "A", position: "left" }).container.querySelector("label")?.getAttribute("data-position")).toBe("left");
    expect(build({ type: "text", id: "b", title: "B", config: { position: "right" } }).container.querySelector("label")?.getAttribute("data-position")).toBe("right");
  });

  it("leaves a plain text label without a position hint", () => {
    const { container } = build({ type: "text", id: "name", title: "Nama" });

    expect(container.querySelector("label")?.hasAttribute("data-position")).toBe(false);
  });

  it("prefers label over title, because title is only the legacy shorthand", () => {
    const { container } = build({ type: "text", id: "x", title: "legacy", label: "Real label" });

    expect(container.querySelector("label")?.textContent).toBe("Real label");
  });

  it("honours useLabel: false", () => {
    const { container } = build({ type: "text", id: "x", title: "Nama", config: { useLabel: false } });

    expect(container.querySelectorAll("label")).toHaveLength(0);
  });

  it("passes position through as a data attribute, not as a different order", () => {
    const { container } = build({ type: "text", id: "x", title: "Nama", config: { position: "right" } });
    const label = container.querySelector("label") as HTMLElement;

    expect(label.getAttribute("data-position")).toBe("right");
    expect(label.nextElementSibling?.tagName).toBe("INPUT");
  });
});

describe("InputBuilder attributes", () => {
  it("maps id and name, defaulting name to the id", () => {
    const { container, control } = build({ type: "email", id: "email" });

    expect(control.id).toBe("email");
    expect(control.getAttribute("name")).toBe("email");
    expect(container.querySelector("label")).toBeNull();
  });

  it("leaves boolean attributes absent when the schema says false", () => {
    // The defaults carry `required: false` / `disabled: false`; rendering those as empty
    // attributes disabled every field in the demo form.
    const { control } = build({ type: "text", id: "x", required: false, disabled: false, readonly: false });

    expect(control.hasAttribute("required")).toBe(false);
    expect(control.hasAttribute("disabled")).toBe(false);
    expect(control.hasAttribute("readonly")).toBe(false);
  });

  it("applies the attributes a text field accepts", () => {
    const { control } = build({
      type: "text",
      id: "code",
      required: true,
      readonly: true,
      disabled: true,
      maxlength: 12,
      minlength: 2,
      pattern: "^[a-z]+$",
    });

    expect(control.hasAttribute("required")).toBe(true);
    expect(control.hasAttribute("readonly")).toBe(true);
    expect(control.hasAttribute("disabled")).toBe(true);
    expect(control.getAttribute("maxlength")).toBe("12");
    expect(control.getAttribute("minlength")).toBe("2");
    expect(control.getAttribute("pattern")).toBe("^[a-z]+$");
  });

  it("drops an attribute the type does not accept", () => {
    const { control } = build({ type: "checkbox", id: "agree", maxlength: 12, placeholder: "nope" });

    expect(control.hasAttribute("maxlength")).toBe(false);
    expect(control.hasAttribute("placeholder")).toBe(false);
  });

  it("keeps numeric bounds and falls back to step=any", () => {
    const bounded = build({ type: "number", id: "qty", min: 1, max: 9, step: 2 }).control;
    const loose = build({ type: "number", id: "qty" }).control;

    expect(bounded.getAttribute("min")).toBe("1");
    expect(bounded.getAttribute("max")).toBe("9");
    expect(bounded.getAttribute("step")).toBe("2");
    expect(loose.getAttribute("step")).toBe("any");
  });

  it("leaves radios unchecked unless the schema asks for it", () => {
    expect((build({ type: "radio", id: "a", name: "pick" }).control as HTMLInputElement).checked).toBe(false);
    expect((build({ type: "radio", id: "b", name: "pick", checked: true }).control as HTMLInputElement).checked).toBe(true);
  });

  it("renders a select with its placeholder and options", () => {
    const { control } = build({
      type: "select",
      id: "size",
      required: true,
      config: { options: ["S", "M"] },
    });
    const options = [...(control as HTMLSelectElement).options].map((o) => o.value);

    expect((control as HTMLSelectElement).required).toBe(true);
    expect(options).toEqual(["", "S", "M"]);
  });

  it("accepts options written flat on the schema, as a sheet does", () => {
    const { control } = build({ type: "select", id: "size", options: ["S", "M", "L"] });
    const options = [...(control as HTMLSelectElement).options].map((o) => o.value);

    expect(options).toEqual(["", "S", "M", "L"]);
  });

  it("keeps config.attributes as the escape hatch, applied last", () => {
    const { control } = build({
      type: "text",
      id: "x",
      config: { attributes: [{ name: "data-test", value: "ok" }, { name: "maxlength", value: "3" }] },
    });

    expect(control.getAttribute("data-test")).toBe("ok");
    expect(control.getAttribute("maxlength")).toBe("3");
  });

  it("still renders a hidden field", () => {
    const { control } = build({ type: "hidden", id: "token", value: "abc" });

    expect((control as HTMLInputElement).type).toBe("hidden");
    expect((control as HTMLInputElement).value).toBe("abc");
  });

  it("marks a file field as tabular only when it asks for it", () => {
    // `data-uploader-csv` is the declaration the table module listens for: the input
    // layer flags it and still never parses anything. Without the flag (or with a plain
    // `file` field) a CSV preview would be attached to a photo upload.
    expect(build({ type: "file", id: "a" }).control.hasAttribute("data-uploader-csv")).toBe(false);
    expect(build({ type: "file", id: "b", config: { csv: true } }).control.hasAttribute("data-uploader-csv")).toBe(true);
    expect(build({ type: "file", id: "c", config: { csv: true } }).control.hasAttribute("data-uploader")).toBe(true);
  });
});

describe("InputRegistry", () => {
  it("has a row for every type it can be asked about", () => {
    for (const [type, definition] of Object.entries(INPUT_TYPE_REGISTRY)) {
      expect(definition, type).toBeDefined();
      expect(Array.isArray(definition.attributes), type).toBe(true);
    }
  });

  it("falls back to text for an unknown type", () => {
    expect(inputTypeOf("nope")).toBe(INPUT_TYPE_REGISTRY.text);
    expect(inputTypeOf(undefined)).toBe(INPUT_TYPE_REGISTRY.text);
  });

  it("separates structural keys from attributes", () => {
    const scan = scanInputAttributes("text", {
      type: "text",
      id: "name",
      title: "Nama",
      placeholder: "Nama lengkap",
      config: {},
      bogus: 1,
    });

    expect(scan.structural).toEqual(["type", "id", "title", "config"]);
    expect(scan.accepted).toEqual(["placeholder"]);
    expect(scan.rejected).toEqual(["bogus"]);
  });
});

describe("InputAttributeBuilder.scan", () => {
  it("rejects at least one key instead of passing on the last one", () => {
    const report = InputAttributeBuilder.scan("text", { placeholder: "ok", bogus: 1 });

    expect(report.ok).toBe(false);
    expect(report.accepted).toEqual(["placeholder"]);
    expect(report.rejected).toEqual(["bogus"]);
  });

  it("accepts a key whitelisted by the caller", () => {
    const report = InputAttributeBuilder.scan("file", { "data-max-upload": 5 }, ["data-max-upload"]);

    expect(report.ok).toBe(true);
    expect(report.accepted).toEqual(["data-max-upload"]);
  });

  it("ignores structural keys", () => {
    const report = InputAttributeBuilder.scan("number", { type: "number", id: "qty", min: 0 });

    expect(report.ok).toBe(true);
    expect(report.structural).toEqual(["type", "id"]);
    expect(report.accepted).toEqual(["min"]);
  });
});

describe("input module registry", () => {
  const withActions = {
    type: "text",
    id: "sku",
    title: "SKU",
    config: { actions: [{ type: "add", label: "Add", onClick: () => undefined }] },
  };

  it("decorates a field with the action set when the controls module is registered", () => {
    const { container } = build(withActions, { modules: new ModuleLoader("input", CORE_INPUT_MODULES) });

    expect(container.classList.contains("actions")).toBe(true);
    expect(container.querySelector("button")).not.toBeNull();
  });

  it("renders the bare field when the controls module is not registered", () => {
    const { container } = build(withActions, { modules: new ModuleLoader("input", LITE_INPUT_MODULES) });

    expect(container.classList.contains("actions")).toBe(false);
    expect(container.querySelector("button")).toBeNull();
    expect(container.querySelector("input")).not.toBeNull();
  });

  it("lets a project module own a field type the registry has never heard of", () => {
    const renderControl = vi.fn((field: any) => {
      if (field.type !== "rating") return null;
      const el = document.createElement("div");
      el.className = "rating-stars";
      return el;
    });

    const loader = new ModuleLoader("input", [
      ...CORE_INPUT_MODULES,
      { id: "rating", load: () => ({ renderControl }) },
    ]);
    const { container } = build({ type: "rating", id: "score", title: "Score" }, { modules: loader });

    expect(renderControl).toHaveBeenCalled();
    expect(container.querySelector(".rating-stars")).not.toBeNull();
  });

  it("keeps a plain field free of modules entirely", () => {
    const { container, control } = build(
      { type: "text", id: "name", title: "Nama" },
      { modules: new ModuleLoader("input", LITE_INPUT_MODULES) }
    );

    expect(control.tagName).toBe("INPUT");
    expect(container.querySelectorAll("label")).toHaveLength(1);
  });
});

describe("InputBuilder toggle style", () => {
  it("renders a radio as a switch when config.style is toggle", () => {
    const { container, control } = build({ type: "radio", id: "pickup", name: "delivery", title: "Ambil sendiri", config: { style: "toggle" } });

    expect((control as HTMLInputElement).type).toBe("radio");
    expect(container.querySelector(".switch.control")).not.toBeNull();
    expect(container.querySelector(".slider")).not.toBeNull();
    expect(container.querySelector("label")?.getAttribute("data-position")).toBe("right");
  });

  it("keeps the native dot for a radio without the toggle style", () => {
    const { container, control } = build({ type: "radio", id: "courier", name: "delivery", title: "Kirim kurir" });

    expect((control as HTMLInputElement).type).toBe("radio");
    expect(container.querySelector(".switch.control")).toBeNull();
  });

  it("does not start a toggle checked unless the schema says so", () => {
    const off = build({ type: "radio", id: "a", name: "g", title: "A", config: { style: "toggle" } }).control;
    const on = build({ type: "radio", id: "b", name: "g", title: "B", checked: true, config: { style: "toggle" } }).control;

    expect((off as HTMLInputElement).checked).toBe(false);
    expect((on as HTMLInputElement).checked).toBe(true);
  });

  it("keeps radio group semantics: same name, one value each", () => {
    const first = build({ type: "radio", id: "a", name: "delivery", value: "pickup", title: "A", config: { style: "toggle" } }).control as HTMLInputElement;
    const second = build({ type: "radio", id: "b", name: "delivery", value: "courier", title: "B", config: { style: "toggle" } }).control as HTMLInputElement;

    expect(first.name).toBe("delivery");
    expect(second.name).toBe("delivery");
    expect(first.value).toBe("pickup");
    expect(second.value).toBe("courier");
  });
});
