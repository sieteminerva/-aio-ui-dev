import { describe, expect, it, vi } from "vitest";
import { ThemeRenderer, ThemeRegistry } from "@aio-ui/theme";
import { getTemplates, TemplateRegistry } from "@aio-ui/core";

/** A theme that rewrites the page and records its lifecycle calls. */
function createSpyTheme(id = "spy") {
  return {
    themeId: id,
    name: id,
    beforePageRender: vi.fn((pages: any[], menu: any, footer: any) => ({ pages, menu, footer })),
    activate: vi.fn(),
    deactivate: vi.fn(),
  };
}

describe("TemplateRegistry", () => {
  it("resolves a theme override and falls back otherwise", () => {
    const templates = new TemplateRegistry();
    const override = () => undefined;
    const fallback = () => undefined;

    templates.register("cyberpunk", "@masonry>item", override);

    expect(templates.resolve("cyberpunk", "@masonry>item", fallback)).toBe(override);
    expect(templates.resolve("default", "@masonry>item", fallback)).toBe(fallback);
    expect(templates.resolve("cyberpunk", "@other", null)).toBeNull();
  });

  it("scopes overrides per theme, so two themes can own the same token", () => {
    const templates = new TemplateRegistry();
    const a = () => undefined;
    const b = () => undefined;

    templates.register("a", "@masonry>item", a);
    templates.register("b", "@masonry>item", b);

    expect(templates.resolve("a", "@masonry>item", null)).toBe(a);
    expect(templates.resolve("b", "@masonry>item", null)).toBe(b);
  });

  it("unregisters and clears", () => {
    const templates = new TemplateRegistry();
    templates.register("a", "@x", () => undefined);

    expect(templates.unregister("a", "@x")).toBe(true);
    expect(templates.unregister("a", "@x")).toBe(false);
    expect(templates.size).toBe(0);
  });
});

describe("ThemeRegistry", () => {
  it("stores themes by id and lists them in order", () => {
    const themes = new ThemeRegistry().register(createSpyTheme("default")).register(createSpyTheme("spy"));

    expect(themes.ids()).toEqual(["default", "spy"]);
    expect(themes.has("spy")).toBe(true);
    expect(themes.resolve("nope")).toBeNull();
  });
});

describe("ThemeRenderer", () => {
  it("applies the first registered theme and installs the template store on destroy", () => {
    const renderer = new ThemeRenderer({ themes: [createSpyTheme("first")] });

    expect(renderer.current).toBe("first");
    expect(getTemplates()).toBeInstanceOf(TemplateRegistry);

    renderer.destroy();
    expect(getTemplates().size).toBe(0);
  });

  it("prepares a node tree through the active theme", () => {
    const theme = createSpyTheme();
    const renderer = new ThemeRenderer({ themes: [theme] });
    const page = { ".page": { content: {} } };

    const prepared = renderer.prepare(page, "home", "spy");

    expect(prepared).toBe(page);
    expect(theme.beforePageRender).toHaveBeenCalledOnce();
    renderer.destroy();
  });

  it("prepares a block document through the active theme", () => {
    const theme = createSpyTheme();
    const renderer = new ThemeRenderer({ themes: [theme] });
    const page = { route: "home", blocks: [{ type: "table", props: {} }] };

    const prepared = renderer.prepare(page, "home", "spy");

    expect(prepared.blocks).toHaveLength(1);
    expect(prepared.route).toBe("home");
    renderer.destroy();
  });

  it("keeps the current theme when asked for an unknown id", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const renderer = new ThemeRenderer({ themes: [createSpyTheme("default")] });

    renderer.use("does-not-exist");

    expect(renderer.current).toBe("default");
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("Unknown theme"));
    warn.mockRestore();
    renderer.destroy();
  });

  it("switches theme without needing a reload", () => {
    const renderer = new ThemeRenderer({ themes: [createSpyTheme("default"), createSpyTheme("spy")] });

    renderer.use("spy");

    expect(renderer.current).toBe("spy");
    renderer.destroy();
  });
});
