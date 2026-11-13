// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ensureStylesheet, holdUntilStyled, injectLazyCss, isStyleInjected, isStylesheetPending, releaseMarkers, replaceLazyCss, styleTagId, useStylesheetAssets } from "../Stylesheets";

/**
 * The stylesheet seam is what replaced `import "./X.css"` in every component.
 *
 * Two things have to hold: a component can name its sheet the way it always did
 * (`"./Table.css"`, relative to itself) even though the host keys the map by module
 * specifier, and no code path may inject the same sheet twice — the registry injects
 * before a render, a nested builder asks again on `create()`.
 */

const CSS = "@media all { table.table { border: 1px solid gold } }";

function hostStyles(keys: string[] = ["@aio-ui/table/Table.css"]) {
  const loaders = Object.fromEntries(keys.map((key) => [key, vi.fn(async () => ({ default: CSS }))]));
  return loaders as Record<string, ReturnType<typeof vi.fn>>;
}

beforeEach(() => {
  document.head.replaceChildren();
  useStylesheetAssets({});
});

describe("stylesheet seam", () => {
  it("resolves a component's relative declaration against the host's key layout", async () => {
    const loaders = hostStyles();
    useStylesheetAssets(loaders as any);

    await ensureStylesheet("./Table.css");

    expect(loaders["@aio-ui/table/Table.css"]).toHaveBeenCalledTimes(1);
    expect(isStyleInjected("@aio-ui/table/Table.css")).toBe(true);
  });

  it("matches by file name when the host path is deeper than the component knows", async () => {
    const loaders = hostStyles(["@aio-ui/form/FileUploader/FileUploader.css"]);
    useStylesheetAssets(loaders as any);

    await ensureStylesheet("./FileUploader.css");

    expect(loaders["@aio-ui/form/FileUploader/FileUploader.css"]).toHaveBeenCalledTimes(1);
  });

  it("injects once, however many builders ask for the same sheet", async () => {
    const loaders = hostStyles();
    useStylesheetAssets(loaders as any);

    await Promise.all([ensureStylesheet("./Table.css"), ensureStylesheet("@aio-ui/table/Table.css")]);
    await ensureStylesheet("./Table.css");

    expect(loaders["@aio-ui/table/Table.css"]).toHaveBeenCalledTimes(1);
    expect(document.querySelectorAll(`#${styleTagId("@aio-ui/table/Table.css")}`)).toHaveLength(1);
  });

  it("treats a sheet the registry already injected as done", async () => {
    const loaders = hostStyles();
    useStylesheetAssets(loaders as any);

    // The registry path writes the <style> itself before a render.
    const style = document.createElement("style");
    style.id = styleTagId("@aio-ui/table/Table.css");
    style.textContent = CSS;
    document.head.appendChild(style);

    await ensureStylesheet("./Table.css");

    expect(loaders["@aio-ui/table/Table.css"]).not.toHaveBeenCalled();
    expect(document.querySelectorAll("style")).toHaveLength(1);
  });

  it("is silent when the host declares no sheet — a missing style is not fatal", async () => {
    await expect(ensureStylesheet("./Unknown.css")).resolves.toBeUndefined();
    expect(document.querySelectorAll("style")).toHaveLength(0);
  });

  it("accepts a loader that returns raw text as well as a module", async () => {
    useStylesheetAssets({ "@aio-ui/table/Table.css": async () => CSS });

    await ensureStylesheet("./Table.css");

    expect(document.querySelector("style")?.textContent).toContain("border: 1px solid gold");
  });

  describe("stylesheet hot path (opt-in)", () => {
    const SPEC = "@aio-ui/table/Table.css";

    it("keeps injection lazy: a second inject never overwrites the sheet", () => {
      injectLazyCss(CSS, SPEC);
      injectLazyCss("/* edited */", SPEC);

      expect(document.querySelectorAll("style")).toHaveLength(1);
      expect(document.getElementById(styleTagId(SPEC))?.textContent).toBe(CSS);
    });

    it("swaps the text of an injected sheet without adding a second element", () => {
      injectLazyCss(CSS, SPEC);

      replaceLazyCss("@media all { table.table { border: 2px solid teal } }", SPEC);

      expect(document.querySelectorAll("style")).toHaveLength(1);
      expect(document.getElementById(styleTagId(SPEC))?.textContent).toContain("2px solid teal");
    });

    it("falls back to lazy injection when the sheet is not there yet", () => {
      replaceLazyCss(CSS, SPEC);

      expect(document.querySelectorAll("style")).toHaveLength(1);
      expect(isStyleInjected(SPEC)).toBe(true);
    });
  });
});

describe("pending probe (anti-FOUC decision)", () => {
  it("is pending only while the host has a loader and the document lacks the sheet", () => {
    useStylesheetAssets({ "@aio-ui/table/Table.css": async () => CSS });

    expect(isStylesheetPending("./Table.css")).toBe(true);

    injectLazyCss(CSS, "@aio-ui/table/Table.css");

    expect(isStylesheetPending("./Table.css")).toBe(false);
  });

  it("is never pending for a sheet no loader can serve", () => {
    expect(isStylesheetPending("./Undeclared.css")).toBe(false);
  });
});

describe("hold seam (the whole anti-FOUC contract)", () => {
  function root(): HTMLElement {
    return document.createElement("div");
  }

  /** Lets the seam's promise chain (`load → inject → release`) run one more step. */
  function tick(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 0));
  }

  it("marks the root while the sheet is missing and releases it when it lands", async () => {
    let resolveSheet!: (value: { default: string }) => void;
    useStylesheetAssets({
      "@aio-ui/table/Table.css": () => new Promise<{ default: string }>((resolve) => { resolveSheet = resolve; }),
    });
    const element = root();

    holdUntilStyled(element, "./Table.css");

    expect(element.style.getPropertyValue("--is-loading")).toBe("1");
    expect(element.hasAttribute("data-hydrating")).toBe(true);
    expect(element.hasAttribute("data-loaded")).toBe(false);

    await tick(); // the loader is invoked from a microtask, not on the call itself
    resolveSheet({ default: CSS });
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
