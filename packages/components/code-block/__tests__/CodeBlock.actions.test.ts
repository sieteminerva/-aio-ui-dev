// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ACTION_LABELS, CodeBlockBuilder } from "../CodeBlock";
import type { iCodeBlockActionContext } from "../CodeBlock";

/**
 * The action set is the only interactive part of a code block, so it is pinned in the DOM:
 * the buttons must be per panel, `edit`/`save` must flip `contentEditable` on that panel's
 * `<code>` only, and the caller's `onClick` must be the sink (no invented event name).
 */

const clipboard = { writeText: vi.fn(() => Promise.resolve()) };

beforeEach(() => {
  clipboard.writeText.mockClear();
  Object.defineProperty(navigator, "clipboard", { value: clipboard, configurable: true });
});

const build = (config: ConstructorParameters<typeof CodeBlockBuilder>[0], payload: any) =>
  new CodeBlockBuilder(config).create(payload);

describe("Code Block actions", () => {
  it("renders no action row when nothing is configured", () => {
    const root = build({}, { code: "const a = 1;" });

    expect(root.querySelectorAll(".actions")).toHaveLength(0);
    expect(root.querySelectorAll("button")).toHaveLength(0);
  });

  it("prints one action row per panel, in config order", () => {
    const root = build(
      {
        actions: [
          { type: "copy", onClick: () => undefined },
          { type: "edit", onClick: () => undefined },
          { type: "save", label: "Simpan", onClick: () => undefined },
        ],
      },
      { blocks: [{ code: "a" }, { code: "b" }] },
    );

    const figures = root.querySelectorAll("figure.frame");
    expect(figures).toHaveLength(2);

    for (const figure of Array.from(figures)) {
      const buttons = Array.from(figure.querySelectorAll<HTMLButtonElement>(".actions button"));
      expect(buttons.map((button) => button.dataset.action)).toEqual(["copy", "edit", "save"]);
      expect(buttons.map((button) => button.type)).toEqual(["button", "button", "button"]);
    }

    expect(root.querySelector('[data-action="save"]')?.textContent).toBe("Simpan");
    expect(root.querySelector('[data-action="copy"]')?.textContent).toBe(ACTION_LABELS.copy);
  });

  it("turns the panel into an editor on edit and commits on save", () => {
    const root = build(
      {
        actions: [
          { type: "edit", onClick: () => undefined },
          { type: "save", onClick: () => undefined },
        ],
      },
      { blocks: [{ code: "first\n" }, { code: "second" }] },
    );

    const [first, second] = Array.from(root.querySelectorAll("figure.frame"));
    const firstCode = first.querySelector("code") as HTMLElement;
    const secondCode = second.querySelector("code") as HTMLElement;

    (first.querySelector('[data-action="edit"]') as HTMLButtonElement).click();

    expect(firstCode.contentEditable).toBe("true");
    expect(first.classList.contains("editing")).toBe(true);
    // The other panel is untouched: actions are scoped to their own figure.
    expect(secondCode.hasAttribute("contenteditable")).toBe(false);
    expect(second.classList.contains("editing")).toBe(false);

    firstCode.textContent = "first edited   \n\n";
    (first.querySelector('[data-action="save"]') as HTMLButtonElement).click();

    expect(firstCode.textContent).toBe("first edited");
    expect(firstCode.contentEditable).toBe("false");
    expect(first.classList.contains("editing")).toBe(false);
  });

  it("copies the panel text", () => {
    const root = build(
      { actions: [{ type: "copy", onClick: () => undefined }] },
      { code: "npm run verify" },
    );

    (root.querySelector('[data-action="copy"]') as HTMLButtonElement).click();

    expect(clipboard.writeText).toHaveBeenCalledWith("npm run verify");
  });

  it("hands the caller the figure and an input-shaped context", () => {
    const seen: Array<{ panel: HTMLElement; context: iCodeBlockActionContext }> = [];
    const root = build(
      {
        actions: [
          {
            type: "custom",
            label: "Lint",
            onClick: (panel, context) => {
              seen.push({ panel, context });
            },
          },
        ],
      },
      { blocks: [{ code: "x" }, { code: "y", label: "ts", language: "ts" }] },
    );

    const figure = root.querySelectorAll("figure.frame")[1] as HTMLElement;
    (figure.querySelector('[data-action="custom"]') as HTMLButtonElement).click();

    expect(seen).toHaveLength(1);
    expect(seen[0].panel).toBe(figure);
    expect(seen[0].context.action).toBe("custom");
    expect(seen[0].context.element).toBe(figure.querySelector("code"));
    expect(seen[0].context.value).toBe("y");
    expect(seen[0].context.label).toBe("Lint");
    expect(seen[0].context.language).toBe("ts");
    expect(seen[0].context.index).toBe(1);
  });

  it("survives an action whose handler rejects", async () => {
    const root = build(
      { actions: [{ type: "save", onClick: () => Promise.reject(new Error("offline")) }] },
      { code: "kept" },
    );

    expect(() => (root.querySelector('[data-action="save"]') as HTMLButtonElement).click()).not.toThrow();
    await Promise.resolve();
  });
});
