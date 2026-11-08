import { describe, expect, it } from "vitest";

import { CyberpunkTheme } from "../src/CyberpunkTheme";

/** A shell stand-in: this theme only flips `dataset.theme`. */
function createShell() {
  return { dataset: {} as DOMStringMap };
}

describe("CyberpunkTheme", () => {
  it("identifies itself", () => {
    const theme = new CyberpunkTheme();
    expect(theme.themeId).toBe("cyberpunk");
    expect(theme.name).toBe("Cyberpunk");
  });

  it("marks the shell so the stylesheet can scope its token overrides", () => {
    const shell = createShell();
    new CyberpunkTheme().activate(shell as unknown as HTMLElement, []);

    expect(shell.dataset.theme).toBe("cyberpunk");
  });

  it("leaves the shell as it found it", () => {
    const theme = new CyberpunkTheme();
    const shell = createShell();

    theme.activate(shell as unknown as HTMLElement, []);
    theme.deactivate(shell as unknown as HTMLElement);

    expect(shell.dataset.theme).toBeUndefined();
  });

  it("does not strip a marker another theme owns", () => {
    const shell = { dataset: { theme: "horizontal" } as DOMStringMap };
    new CyberpunkTheme().deactivate(shell as unknown as HTMLElement);

    expect(shell.dataset.theme).toBe("horizontal");
  });

  it("passes the page tree through untouched", () => {
    const pages = [{ ".page": {} }];
    expect(new CyberpunkTheme().beforePageRender(pages, null, null).pages).toBe(pages);
  });
});
