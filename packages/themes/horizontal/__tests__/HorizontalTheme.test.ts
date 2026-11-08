import { describe, expect, it } from "vitest";

import { HorizontalTheme } from "../src/HorizontalTheme";

/**
 * The scroll engine touches `document`/`window`, so `activate()` is measured in the
 * browser (gallery `?theme=horizontal`). What can be asserted here is the theme contract:
 * identity plus a structural hook that must not rewrite the page.
 */
describe("HorizontalTheme", () => {
  it("identifies itself as the horizontal layout", () => {
    const theme = new HorizontalTheme();
    expect(theme.themeId).toBe("horizontal");
    expect(theme.name).toBe("Horizontal");
  });

  it("passes the page tree through untouched", () => {
    const pages = [{ ".page": {} }];
    const result = new HorizontalTheme().beforePageRender(pages, null, null);

    expect(result.pages).toBe(pages);
    expect(result.menu).toBeNull();
    expect(result.footer).toBeNull();
  });

  it("builds a scroll engine lazily, not at construction", () => {
    // Constructing the theme in a DOM-free environment must not throw; the engine is only
    // touched from activate()/deactivate().
    expect(() => new HorizontalTheme()).not.toThrow();
  });
});
