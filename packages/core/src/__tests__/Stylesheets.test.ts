// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ensureStylesheet, isStyleInjected, styleTagId, useStylesheetAssets } from "../Stylesheets";

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
});
