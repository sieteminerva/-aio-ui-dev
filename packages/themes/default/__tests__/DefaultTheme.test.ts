import { describe, expect, it } from "vitest";

import { DefaultTheme } from "../src/DefaultTheme";

/**
 * A minimal shell stand-in: the hooks only touch `style` and `removeAttribute`, so a
 * fake is enough and the suite stays DOM-free.
 */
function createShell() {
  const removed: string[] = [];
  return {
    style: {} as CSSStyleDeclaration,
    removed,
    removeAttribute(name: string) {
      removed.push(name);
    },
  };
}

describe("DefaultTheme", () => {
  it("identifies itself as the reference theme", () => {
    const theme = new DefaultTheme();
    expect(theme.themeId).toBe("default");
    expect(theme.name).toBe("Default");
  });

  it("passes the page tree through untouched", () => {
    const pages = [{ ".page": {} }];
    const menu = { "nav.nav": {} };
    const footer = { "footer": {} };

    const result = new DefaultTheme().beforePageRender(pages, menu, footer);

    expect(result).toEqual({ pages, menu, footer });
    expect(result.pages).toBe(pages);
    expect(result.menu).toBe(menu);
  });

  it("makes the shell visible on activate and restores it on deactivate", () => {
    const theme = new DefaultTheme();
    const shell = createShell();

    theme.activate(shell as unknown as HTMLElement, []);
    expect(shell.style.display).toBe("block");
    expect(shell.style.overflow).toBe("initial");

    theme.deactivate(shell as unknown as HTMLElement);
    expect(shell.removed).toEqual(["style"]);
  });
});
