// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DropdownBuilder } from "../Dropdown/Dropdown";

const content = {
  options: [
    { id: "1", label: "Jakarta" },
    { id: "2", label: "Bandung" },
  ],
  config: { style: "select" },
};

/**
 * The dropdown used to keep two `document` listeners (`click` + `mousedown`) for its whole
 * life. Nothing destroys a page-built form, so every mount pinned one builder plus its DOM
 * subtree: measured in `docs/framework/APP-LIFECYCLE.md` §3 (L5).
 */

function mount(): { root: HTMLElement } {
  const root = new DropdownBuilder({} as any).create(content as any) as HTMLElement;
  document.body.appendChild(root);
  return { root };
}

const docListeners = (spy: ReturnType<typeof vi.spyOn>, type: string) =>
  spy.mock.calls.filter((call: any[]) => call[0] === type) as any[][];

describe("DropdownBuilder document listeners", () => {
  beforeEach(() => {
    // happy-dom ships no Popover API; the dropdown only needs the two calls.
    (HTMLElement.prototype as any).showPopover = function () { /* no-op */ };
    (HTMLElement.prototype as any).hidePopover = function () { /* no-op */ };
  });

  afterEach(() => {
    delete (HTMLElement.prototype as any).showPopover;
    delete (HTMLElement.prototype as any).hidePopover;
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("registers nothing on document while the menu is closed", () => {
    const addSpy = vi.spyOn(document, "addEventListener");

    mount();

    expect(docListeners(addSpy, "click")).toHaveLength(0);
    expect(docListeners(addSpy, "mousedown")).toHaveLength(0);
  });

  it("binds the outside-close listener on open and drops it on the next outside mousedown", () => {
    const { root } = mount();
    const addSpy = vi.spyOn(document, "addEventListener");
    const removeSpy = vi.spyOn(document, "removeEventListener");

    // A click on the field box (not the input, not an item) opens the menu.
    root.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    const added = docListeners(addSpy, "mousedown");
    expect(added).toHaveLength(1);

    document.body.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));

    const removed = docListeners(removeSpy, "mousedown").some((call) => call[1] === added[0][1]);
    expect(removed).toBe(true);
  });

  it("binds at most once per open, never once per instance", () => {
    const { root } = mount();
    const addSpy = vi.spyOn(document, "addEventListener");

    root.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    root.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    // Second click re-opens (happy-dom has no popover state); rebinding stays guarded.
    expect(docListeners(addSpy, "mousedown").length).toBeLessThanOrEqual(1);
  });
});
