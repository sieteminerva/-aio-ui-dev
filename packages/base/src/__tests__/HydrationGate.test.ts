// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";

import { HydrationGate } from "../BaseAdapters/HydrationGate";

/**
 * The gate is the anti-FOUC seam: one marker on the root, one writer on release.
 *
 * These tests pin the mechanics only (who writes what, and that a re-created
 * instance cannot strand its previous root). The decision *when* to hold lives
 * in `Builder.create()` and is covered by `Base.hydration.test.ts`.
 */

function root(className = "root"): HTMLElement {
  const element = document.createElement("div");
  element.className = className;
  return element;
}

describe("HydrationGate", () => {
  it("marks the top element only", () => {
    const gate = new HydrationGate();
    const element = root();

    gate.applyHold(element);

    expect(element.getAttribute("data-hydrating")).toBe("");
    expect(element.style.getPropertyValue("--is-loading")).toBe("1");
    expect(element.hasAttribute("data-loaded")).toBe(false);
  });

  it("releases with the permanent pointer and is idempotent", () => {
    const gate = new HydrationGate();
    const element = root();
    gate.applyHold(element);

    gate.release();
    gate.release();

    expect(element.hasAttribute("data-hydrating")).toBe(false);
    expect(element.getAttribute("data-loaded")).toBe("true");
    expect(element.style.getPropertyValue("--is-loading")).toBe("0");
  });

  it("clears the previous generation when the instance rebuilds before releasing", () => {
    const gate = new HydrationGate();
    const first = root("first");
    const second = root("second");

    gate.applyHold(first);
    gate.applyHold(second);

    expect(first.hasAttribute("data-hydrating")).toBe(false);
    expect(first.getAttribute("data-loaded")).toBe("true");
    expect(second.hasAttribute("data-hydrating")).toBe(true);
  });

  it("clears stale markers left on a recycled root", () => {
    const gate = new HydrationGate();
    const element = root();
    element.setAttribute("data-hydrating", "");
    element.style.setProperty("--is-loading", "1");

    gate.release(element);

    expect(element.hasAttribute("data-hydrating")).toBe(false);
    expect(element.getAttribute("data-loaded")).toBe("true");
  });

  it("survives a release without a hold", () => {
    const gate = new HydrationGate();

    expect(() => gate.forceRelease()).not.toThrow();
    expect(gate.isLoaded).toBe(true);
  });
});
