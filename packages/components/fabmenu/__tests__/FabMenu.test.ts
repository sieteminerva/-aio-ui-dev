// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";

import { FabMenuBuilder } from "../FabMenu";

/**
 * FabMenu closes itself after an idle `duration`, so the tests disable it (`duration: null`)
 * instead of waiting on a timer.
 */

function build(payload: any, config: Record<string, any> = {}): HTMLElement {
  return new FabMenuBuilder({ duration: null, ...config }).create(payload) as HTMLElement;
}

describe("fab menu", () => {
  it("renders the trigger and one option per action", () => {
    const root = build({ title: "Menu", actions: [{ label: "A" }, { label: "B" }] });

    expect(root.classList.contains("fab")).toBe(true);
    expect(root.querySelector(".trigger")).not.toBeNull();

    const options = root.querySelectorAll(".panel .item.option");
    expect(options).toHaveLength(2);
    expect(options[0].textContent).toBe("A");
    expect(options[0].tagName).toBe("BUTTON");
  });

  it("uppercases the panel title and defaults it to MENU", () => {
    expect(build({ title: "menu", actions: [] }).querySelector(".panel .title")?.textContent).toBe("MENU");
    expect(build({ actions: [] }).querySelector(".panel .title")?.textContent).toBe("MENU");
  });

  it("falls back to a readable label for an action without one", () => {
    const root = build({ actions: [{}] });

    expect(root.querySelector(".item.option")?.textContent).toBe("Option");
  });

  it("keeps the trigger outside the panel for a bottom position", () => {
    const root = build({ actions: [] }, { position: "bottom-right" });
    const children = Array.from(root.children).map((child) => child.className);

    expect(children).toEqual(["panel", "trigger"]);
  });
});
