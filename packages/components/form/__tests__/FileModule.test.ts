// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";

import { fileUploaderInputModule } from "../FileUploader/FileUploader.InputModule";
import { LITE_INPUT_MODULES, mountInputModules } from "../InputRegistry";

/**
 * The file capability belongs to the module, not to the input layer: no module, no
 * callback. These tests build the module directly — the uploader's own UI is irrelevant to
 * whether the data channel works, which is exactly what `decorate` reports first.
 */
function fieldWithCallback() {
  const onFileSelected = vi.fn();
  const field: any = { type: "file", id: "attachment", name: "attachment", config: { onFileSelected } };
  return { onFileSelected, field };
}

function host() {
  const emit = vi.fn();
  return { emit, context: { builderConfig: { themeId: "default", emit } } };
}

describe("file input module", () => {
  it("reports raw files through config.onFileSelected", () => {
    const module = fileUploaderInputModule.load({ builderConfig: {} });
    const { field, onFileSelected } = fieldWithCallback();
    const input = document.createElement("input");
    input.type = "file";

    module.decorate?.(document.createElement("div"), input, field, host().context);

    const file = new File(["a,b\n1,2"], "rows.csv", { type: "text/csv" });
    Object.defineProperty(input, "files", { value: [file], configurable: true });
    input.dispatchEvent(new Event("change"));

    expect(onFileSelected).toHaveBeenCalledTimes(1);
    expect(onFileSelected.mock.calls[0][0]).toEqual([file]);
    expect(onFileSelected.mock.calls[0][1].id).toBe("attachment");
  });

  it("announces the same selection on the global channel", () => {
    const module = fileUploaderInputModule.load({ builderConfig: {} });
    const { field } = fieldWithCallback();
    const { emit, context } = host();
    const input = document.createElement("input");
    input.type = "file";

    module.decorate?.(document.createElement("div"), input, field, context);
    Object.defineProperty(input, "files", { value: [], configurable: true });
    input.dispatchEvent(new Event("change"));

    expect(emit).toHaveBeenCalledWith("elementChanged", expect.objectContaining({ type: "@field>file" }));
  });

  it("ignores fields that are not file inputs", () => {
    const module = fileUploaderInputModule.load({ builderConfig: {} });
    const input = document.createElement("input");
    input.type = "text";
    const listener = vi.fn();

    module.decorate?.(document.createElement("div"), input, { type: "text", config: {} } as any, host().context);
    input.dispatchEvent(new Event("change"));

    expect(listener).not.toHaveBeenCalled();
  });

  it("exposes getFiles as a module capability", () => {
    const module = fileUploaderInputModule.load({ builderConfig: {} });

    expect(typeof module.getFiles).toBe("function");
    expect(module.getFiles?.("missing-form")).toEqual({});
  });

  it("has no file capability at all when the preset omits the module", () => {
    const loader = LITE_INPUT_MODULES;
    const hasFileModule = loader.some((definition) => definition.id === "file");

    expect(hasFileModule).toBe(false);
    expect(() => mountInputModules(document.createElement("form"), loader)).not.toThrow();
  });
});
