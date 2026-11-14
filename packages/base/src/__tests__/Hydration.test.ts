// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { injectLazyCss, useStylesheetAssets } from "@aio-ui/core";

import { holdUntilStyled, releaseMarkers } from "../BaseAdapters/Hydration";

/**
 * The hydration hold — the whole anti-FOUC contract of `Builder.create()`.
 *
 * Two shapes, one decision. The decision is per *sheet* (two components built in one
 * pass own two sheets), never per instance; the release always rides the loader promise,
 * which never rejects, so a builder the registry never sees still heals itself.
 *
 * Shape 1 — shimmer: root marked, animation module paints a generic skin.
 * Shape 2 — mockup: a component implementing `loading()` shows its own silhouette, and
 * the real children are hidden one by one (direct children only) until the sheet lands.
 */

const CSS = "@media all { table.table { border: 1px solid gold } }";

/** A promise this test resolves by hand, so "still loading" is observable. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

/** Lets the seam's promise chain (`load → inject → release`) run one more step. */
function tick(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function root(): HTMLElement {
  return document.createElement("div");
}

/** A root with real content plus a mockup, the shape `create()` hands the seam. */
function heldRoot() {
  const element = root();
  const real = document.createElement("p");
  real.textContent = "real";
  element.appendChild(real);
  const mockup = document.createElement("div");
  mockup.setAttribute("data-skeleton", "root");
  return { element, real, mockup };
}

beforeEach(() => {
  document.head.replaceChildren();
  useStylesheetAssets({});
});

describe("hold seam — shimmer skin", () => {
  it("marks the root while the sheet is missing and releases it when it lands", async () => {
    const sheet = deferred<{ default: string }>();
    useStylesheetAssets({ "@aio-ui/table/Table.css": () => sheet.promise });
    const element = root();

    holdUntilStyled(element, "./Table.css");

    expect(element.style.getPropertyValue("--is-loading")).toBe("1");
    expect(element.hasAttribute("data-hydrating")).toBe(true);
    expect(element.hasAttribute("data-loaded")).toBe(false);

    await tick(); // the loader is invoked from a microtask, not on the call itself
    sheet.resolve({ default: CSS });
    await tick();

    expect(element.hasAttribute("data-hydrating")).toBe(false);
    expect(element.getAttribute("data-loaded")).toBe("true");
    expect(element.style.getPropertyValue("--is-loading")).toBe("0");
  });

  it("releases immediately when the sheet is already in the document", () => {
    useStylesheetAssets({ "@aio-ui/table/Table.css": async () => CSS });
    injectLazyCss(CSS, "@aio-ui/table/Table.css");
    const element = root();

    holdUntilStyled(element, "./Table.css");

    expect(element.hasAttribute("data-hydrating")).toBe(false);
    expect(element.getAttribute("data-loaded")).toBe("true");
  });

  it("never holds a builder the host serves no sheet for", () => {
    const element = root();

    holdUntilStyled(element, "./Undeclared.css");

    expect(element.hasAttribute("data-hydrating")).toBe(false);
    expect(element.getAttribute("data-loaded")).toBe("true");
  });

  it("releases a held root even when the loader rejects", async () => {
    useStylesheetAssets({
      "@aio-ui/table/Table.css": () => Promise.reject(new Error("chunk gone")),
    });
    const element = root();

    holdUntilStyled(element, "./Table.css");
    expect(element.hasAttribute("data-hydrating")).toBe(true);

    await tick();
    await tick();

    expect(element.hasAttribute("data-hydrating")).toBe(false);
    expect(element.getAttribute("data-loaded")).toBe("true");
  });

  it("writes the three release markers and nothing else", () => {
    const element = root();
    element.style.setProperty("--is-loading", "1");
    element.setAttribute("data-hydrating", "");

    releaseMarkers(element);

    expect(element.style.getPropertyValue("--is-loading")).toBe("0");
    expect(element.hasAttribute("data-hydrating")).toBe(false);
    expect(element.getAttribute("data-loaded")).toBe("true");
  });
});

describe("hold seam — component mockup", () => {
  it("shows the mockup instead of the real children until the sheet lands", async () => {
    const sheet = deferred<{ default: string }>();
    useStylesheetAssets({ "@aio-ui/table/Table.css": () => sheet.promise });
    const { element, real, mockup } = heldRoot();
    const factory = vi.fn(() => mockup);

    holdUntilStyled(element, "./Table.css", factory);

    expect(factory).toHaveBeenCalledTimes(1);
    expect(element.firstElementChild).toBe(mockup);
    expect(mockup.getAttribute("aria-hidden")).toBe("true");
    expect(element.getAttribute("data-mockup")).toBe("");
    expect(element.getAttribute("aria-busy")).toBe("true");
    // The shimmer must not paint over a component showing its own silhouette.
    expect(element.hasAttribute("data-hydrating")).toBe(false);
    expect(real.style.display).toBe("none");

    await tick();
    sheet.resolve({ default: CSS });
    await tick();

    expect(element.querySelector("[data-skeleton]")).toBeNull();
    expect(element.hasAttribute("data-mockup")).toBe(false);
    expect(element.hasAttribute("aria-busy")).toBe(false);
    expect(real.style.display).toBe("");
    expect(element.contains(real)).toBe(true);
    expect(element.getAttribute("data-loaded")).toBe("true");
  });

  it("restores the display a child already had", async () => {
    const sheet = deferred<{ default: string }>();
    useStylesheetAssets({ "@aio-ui/table/Table.css": () => sheet.promise });
    const { element, real, mockup } = heldRoot();
    real.style.display = "inline-flex";

    holdUntilStyled(element, "./Table.css", () => mockup);
    expect(real.style.display).toBe("none");

    await tick();
    sheet.resolve({ default: CSS });
    await tick();

    expect(real.style.display).toBe("inline-flex");
  });

  it("does not build a mockup when the sheet is already there", () => {
    useStylesheetAssets({ "@aio-ui/table/Table.css": async () => CSS });
    injectLazyCss(CSS, "@aio-ui/table/Table.css");
    const { element, real } = heldRoot();
    const factory = vi.fn(() => document.createElement("div"));

    holdUntilStyled(element, "./Table.css", factory);

    expect(factory).not.toHaveBeenCalled();
    expect(real.style.display).toBe("");
    expect(element.getAttribute("data-loaded")).toBe("true");
  });

  it("falls back to the shimmer skin when the builder returns nothing", () => {
    useStylesheetAssets({ "@aio-ui/table/Table.css": () => new Promise(() => { }) });
    const element = root();

    holdUntilStyled(element, "./Table.css", () => null);

    expect(element.hasAttribute("data-hydrating")).toBe(true);
    expect(element.hasAttribute("data-mockup")).toBe(false);
  });

  it("survives a loading() that throws — decoration never breaks create()", () => {
    useStylesheetAssets({ "@aio-ui/table/Table.css": () => new Promise(() => { }) });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => { });
    const element = root();

    expect(() => holdUntilStyled(element, "./Table.css", () => {
      throw new Error("mockup gone");
    })).not.toThrow();

    expect(element.hasAttribute("data-hydrating")).toBe(true);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("loading()"), expect.any(Error));
    warn.mockRestore();
  });

  it("honours the minimum visible time a mockup asks for", async () => {
    vi.useFakeTimers();
    try {
      // A specifier no earlier case touched: `ensureStylesheet` keeps its in-flight
      // promise per key, and two cases above deliberately leave a never-settling loader.
      const sheet = deferred<{ default: string }>();
      useStylesheetAssets({ "@aio-ui/skeleton/Skeleton.css": () => sheet.promise });
      const { element, mockup } = heldRoot();
      mockup.setAttribute("data-skeleton-duration", "600");

      holdUntilStyled(element, "./Skeleton.css", () => mockup);

      await vi.advanceTimersByTimeAsync(0); // the loader is invoked from a microtask
      sheet.resolve({ default: CSS });
      await vi.advanceTimersByTimeAsync(10);

      // The sheet is in, the floor is not: a fast load must not flash a skeleton.
      expect(element.firstElementChild).toBe(mockup);
      expect(element.getAttribute("data-loaded")).not.toBe("true");

      await vi.advanceTimersByTimeAsync(600);

      expect(element.hasAttribute("data-mockup")).toBe(false);
      expect(element.getAttribute("data-loaded")).toBe("true");
    } finally {
      vi.useRealTimers();
    }
  });
});
