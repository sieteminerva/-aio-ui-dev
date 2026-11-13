// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BUILDER_INSTANCE, injectLazyCss, releaseBuilders, useStylesheetAssets } from "@aio-ui/core";

import { Builder } from "../Base";

/**
 * Anti-FOUC at the `create()` seam.
 *
 * The hold has to be decided by the *stylesheet state*, because two components
 * built in one pass own two sheets: a per-instance "already loaded once" flag
 * would either freeze everything or nothing. And the release must not depend on
 * the registry — a builder created directly (a table inside a form field) never
 * reaches `ComponentRegistry.build()`, so it has to heal itself.
 *
 * The seam itself (`holdUntilStyled` / `releaseMarkers`) is unit-tested in
 * `@aio-ui/core`; this file only proves that `create()` calls it, at the right
 * moment, with the specifier the builder declares.
 */

const CSS = ".sheet-root { color: red }";

/** A builder whose only interesting trait is the sheet it declares. */
function sheetBuilder(specifier: string) {
  return class SheetBuilder extends Builder<"@sheet", any> {
    readonly builderId = "table" as const;
    readonly name = "table" as const;
    readonly stylesheet = specifier;
    public config: any;

    constructor() {
      super();
      this.config = this.resolveConfig({
        themeId: "default",
        namespace: null,
        emit: () => { },
        selectors: { "@sheet": { tagName: "div", className: "sheet-root" } },
        slots: {},
      });
    }

    public prepare(): HTMLElement {
      return this.render("@sheet")!;
    }

    protected template() { }

    public initialize() { }
  };
}

/** A promise this test resolves by hand, so "still loading" is observable. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

/** Lets the loader chain (`load → inject → release`) finish. */
function settle(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

beforeEach(() => {
  document.head.replaceChildren();
  useStylesheetAssets({});
});

describe("Builder.create — anti-FOUC hold", () => {
  it("holds the root while its sheet is still loading", () => {
    const sheet = deferred<{ default: string }>();
    useStylesheetAssets({ "/Late.css": () => sheet.promise });

    const element = new (sheetBuilder("./Late.css"))().create({});

    expect(element.getAttribute("data-hydrating")).toBe("");
    expect(element.style.getPropertyValue("--is-loading")).toBe("1");
    expect(element.hasAttribute("data-loaded")).toBe(false);
  });

  it("lifts the hold by itself once the sheet lands", async () => {
    const sheet = deferred<{ default: string }>();
    useStylesheetAssets({ "/SelfHeal.css": () => sheet.promise });

    const element = new (sheetBuilder("./SelfHeal.css"))().create({});
    expect(element.hasAttribute("data-hydrating")).toBe(true);

    sheet.resolve({ default: CSS });
    await settle();

    expect(element.hasAttribute("data-hydrating")).toBe(false);
    expect(element.getAttribute("data-loaded")).toBe("true");
    expect(element.style.getPropertyValue("--is-loading")).toBe("0");
  });

  it("does not hold a component the host serves no sheet for", () => {
    const element = new (sheetBuilder("./Undeclared.css"))().create({});

    expect(element.hasAttribute("data-hydrating")).toBe(false);
    expect(element.getAttribute("data-loaded")).toBe("true");
  });

  it("does not hold when the sheet is already in the document", () => {
    useStylesheetAssets({ "/Ready.css": async () => ({ default: CSS }) });
    injectLazyCss(CSS, "/Ready.css");

    const element = new (sheetBuilder("./Ready.css"))().create({});

    expect(element.hasAttribute("data-hydrating")).toBe(false);
    expect(element.getAttribute("data-loaded")).toBe("true");
  });

  it("releases every root it held once the shared sheet settles", async () => {
    const sheet = deferred<{ default: string }>();
    useStylesheetAssets({ "/Twice.css": () => sheet.promise });
    const BuilderClass = sheetBuilder("./Twice.css");
    const instance = new BuilderClass();

    const first = instance.create({});
    const second = instance.create({});

    // Both builds asked for the same in-flight sheet, so both are held.
    expect(first.hasAttribute("data-hydrating")).toBe(true);
    expect(second.hasAttribute("data-hydrating")).toBe(true);

    sheet.resolve({ default: CSS });
    await settle();

    // One promise, two roots: the seam releases the root each call owns.
    expect(first.hasAttribute("data-hydrating")).toBe(false);
    expect(second.hasAttribute("data-hydrating")).toBe(false);
    expect(first.getAttribute("data-loaded")).toBe("true");
    expect(second.getAttribute("data-loaded")).toBe("true");
  });
});

describe("Builder.create — teardown pin", () => {
  it("pins itself on the root so a discarded subtree can destroy it", () => {
    const BuilderClass = sheetBuilder("./Undeclared.css");
    const instance = new BuilderClass();
    const destroy = vi.spyOn(instance, "destroy");

    const element = instance.create({});

    // The pin is what `releaseBuilders` walks for: the instance, not the element.
    expect((element as any)[BUILDER_INSTANCE]).toBe(instance);
    expect(releaseBuilders(element)).toBe(1);
    expect(destroy).toHaveBeenCalledTimes(1);
    expect((element as any)[BUILDER_INSTANCE]).toBeUndefined();
  });
});
