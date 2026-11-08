// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from "vitest";

import { InputControlsBuilder } from "../InputControls/InputControls";
import { mountControls } from "../InputRegistry";

/**
 * A control set is scoped, not per-control: the same builder drives a single `.field` and
 * a whole `<fieldset>` group, so the rules are stated once for both.
 *
 * Three behaviours are pinned here because each one was either missing or wrong:
 *
 * - `edit` present → the scope starts locked, Edit opens it, Save locks it again;
 * - `edit` absent → the scope is explicitly opened, because a set with no Edit button
 *   would otherwise leave read-only controls that nothing can unlock;
 * - `search` is a read: it collects the scope's values, dispatches `search`, and reports
 *   the query as `context.result`.
 */

/** Builds a controls set for a scope, the way the input module does. */
function controls(scope: HTMLElement, actions: Array<Record<string, any>>) {
  const node = new InputControlsBuilder({} as any).create({
    content: { scope, parentElement: scope, position: "right", actions, input: null },
  });
  scope.appendChild(node);
  return node;
}

/** A group of two inputs: one text, one select. */
function group(markup = `<fieldset class="form-group" id="rec-1">
  <input id="rec-name" name="rec-name" type="text" />
  <select id="rec-tier" name="rec-tier"><option value="a">A</option></select>
</fieldset>`): { fieldset: HTMLElement; name: HTMLInputElement; tier: HTMLSelectElement } {
  const holder = document.createElement("div");
  holder.innerHTML = markup;
  document.body.appendChild(holder);
  const fieldset = holder.querySelector("fieldset") as HTMLElement;
  return {
    fieldset,
    name: fieldset.querySelector("#rec-name") as HTMLInputElement,
    tier: fieldset.querySelector("#rec-tier") as HTMLSelectElement,
  };
}

const editSave = () => [
  { type: "edit", label: "Edit", onClick: () => undefined },
  { type: "save", label: "Simpan", onClick: () => undefined },
];

// Every test builds its own scopes; the document is the shared state that would leak.
beforeEach(() => { document.body.replaceChildren(); });

describe("controls on a group", () => {
  it("locks every control of the group when an edit action exists", () => {
    const { fieldset, name, tier } = group();
    controls(fieldset, editSave());

    expect(name.readOnly).toBe(true);
    // A select has no readOnly: disabled is the only lock the platform offers.
    expect(tier.disabled).toBe(true);
    expect(fieldset.getAttribute("data-locked")).toBe("true");
  });

  it("opens the group with Edit and locks it again on Save", () => {
    const { fieldset, name, tier } = group();
    controls(fieldset, editSave());

    (fieldset.querySelector("button.edit") as HTMLButtonElement).click();
    expect(name.readOnly).toBe(false);
    expect(tier.disabled).toBe(false);
    expect(fieldset.hasAttribute("data-locked")).toBe(false);
    expect(fieldset.querySelector("button.save")).not.toBeNull();

    name.value = "Budi";
    (fieldset.querySelector("button.save") as HTMLButtonElement).click();

    expect(name.readOnly).toBe(true);
    expect(tier.disabled).toBe(true);
    expect(fieldset.getAttribute("data-locked")).toBe("true");
    expect(fieldset.querySelector("button.edit")).not.toBeNull();
  });

  it("opens a scope this set locked earlier, when the new set has no edit action", () => {
    const { fieldset, name, tier } = group();
    controls(fieldset, editSave());
    expect(name.readOnly).toBe(true);

    // Re-rendering the same group with a set that cannot unlock must not leave it stuck.
    fieldset.querySelector(".controls")?.remove();
    controls(fieldset, [{ type: "copy", label: "Copy", onClick: () => undefined }]);

    expect(name.readOnly).toBe(false);
    expect(tier.disabled).toBe(false);
    expect(fieldset.hasAttribute("data-locked")).toBe(false);
  });

  it("leaves alone a lock the schema asked for, when nothing was locked by the set", () => {
    const { fieldset } = group(`<fieldset class="form-group" id="rec-2">
      <input id="locked-by-schema" name="locked-by-schema" type="text" readonly />
      <input id="plain" name="plain" type="text" />
    </fieldset>`);
    const locked = fieldset.querySelector("#locked-by-schema") as HTMLInputElement;

    controls(fieldset, [{ type: "copy", label: "Copy", onClick: () => undefined }]);

    // The schema's own attribute is the author's decision, not a state to undo.
    expect(locked.readOnly).toBe(true);
    expect((fieldset.querySelector("#plain") as HTMLInputElement).readOnly).toBe(false);
  });
});

describe("controls search", () => {
  it("collects the group's values and reports them", () => {
    const { fieldset, name, tier } = group();
    const onClick = vi.fn();
    const searched = vi.fn();
    fieldset.addEventListener("search", (event: any) => searched(event.detail));

    name.value = "INV-01";
    tier.value = "a";
    controls(fieldset, [{ type: "search", label: "Cari", onClick }]);

    (fieldset.querySelector("button.search") as HTMLButtonElement).click();

    expect(searched).toHaveBeenCalledTimes(1);
    expect(searched.mock.calls[0][0].query).toEqual({ "rec-name": "INV-01", "rec-tier": "a" });
    expect(onClick).toHaveBeenCalledWith(
      fieldset,
      expect.objectContaining({ action: "search", result: { "rec-name": "INV-01", "rec-tier": "a" } })
    );
  });

  it("marks the scope busy while an async search is pending", async () => {
    const { fieldset } = group();
    let resolve: () => void = () => undefined;
    const pending = new Promise<void>((r) => { resolve = r; });

    controls(fieldset, [{ type: "search", label: "Cari", onClick: () => pending }]);
    (fieldset.querySelector("button.search") as HTMLButtonElement).click();

    expect(fieldset.classList.contains("searching")).toBe(true);
    expect(fieldset.getAttribute("aria-busy")).toBe("true");

    resolve();
    await pending;
    await Promise.resolve();

    expect(fieldset.classList.contains("searching")).toBe(false);
    expect(fieldset.hasAttribute("aria-busy")).toBe(false);
  });

  it("runs the search on Enter inside a text control", () => {
    const { fieldset, name } = group();
    const onClick = vi.fn();
    controls(fieldset, [{ type: "search", label: "Cari", onClick }]);

    name.value = "INV-02";
    name.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe("controls on a field and on a group", () => {
  it("copies the group as a payload, not one value", async () => {
    const { fieldset, name, tier } = group();
    const writeText = vi.fn(async () => undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });

    name.value = "Budi";
    tier.value = "a";
    controls(fieldset, [{ type: "copy", label: "Copy", onClick: () => undefined }]);

    (fieldset.querySelector("button.copy") as HTMLButtonElement).click();
    await Promise.resolve();

    expect(writeText).toHaveBeenCalledWith(JSON.stringify({ "rec-name": "Budi", "rec-tier": "a" }));
  });

  it("duplicates the whole group with fresh ids, and the clone acts on itself", () => {
    const { fieldset, name } = group();
    controls(fieldset, [{ type: "add", label: "Tambah", onClick: () => undefined }]);

    name.value = "Budi";
    (fieldset.querySelector("button.add") as HTMLButtonElement).click();

    const clones = document.querySelectorAll("fieldset.form-group");
    expect(clones).toHaveLength(2);
    const clone = clones[1] as HTMLElement;

    expect(clone.id).toBe("rec-1-1");
    expect((clone.querySelector("#rec-name-1") as HTMLInputElement).name).toBe("rec-name-1");
    // The clone starts empty: duplicating a record must not copy its data.
    expect((clone.querySelector("#rec-name-1") as HTMLInputElement).value).toBe("");

    // Its own edit button edits the clone, not the original.
    (clone.querySelector("button.add") as HTMLButtonElement).click();
    expect(document.querySelectorAll("fieldset.form-group")).toHaveLength(3);
  });

  it("deletes the group it belongs to", () => {
    const { fieldset } = group();
    controls(fieldset, [{ type: "delete", label: "Hapus", onClick: () => undefined }]);

    (fieldset.querySelector("button.delete") as HTMLButtonElement).click();

    expect(document.querySelector("fieldset.form-group")).toBeNull();
  });

  it("still works on a single field, unchanged", () => {
    const field = document.createElement("div");
    field.className = "field";
    field.innerHTML = `<input id="solo" name="solo" type="text" />`;
    document.body.appendChild(field);

    controls(field, editSave());

    const solo = field.querySelector("#solo") as HTMLInputElement;
    expect(solo.readOnly).toBe(true);

    (field.querySelector("button.edit") as HTMLButtonElement).click();
    expect(solo.readOnly).toBe(false);
  });
});

describe("mountControls", () => {
  it("returns null when the preset has no controls module", () => {
    const { fieldset } = group();

    expect(mountControls(fieldset, editSave(), "right", [])).toBeNull();
  });

  it("builds the set through the module registry", () => {
    const { fieldset, name } = group();

    const node = mountControls(fieldset, editSave());

    expect(node?.querySelectorAll("button")).toHaveLength(2);
    expect(name.readOnly).toBe(true);
  });

  it("keeps buttons out of the form's submit path", () => {
    const { fieldset } = group();
    const node = mountControls(fieldset, editSave());

    const types = [...(node?.querySelectorAll("button") ?? [])].map((button) => (button as HTMLButtonElement).type);
    expect(types).toEqual(["button", "button"]);
  });
});
