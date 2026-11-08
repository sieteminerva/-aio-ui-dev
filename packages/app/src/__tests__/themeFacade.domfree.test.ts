import { describe, expect, it } from "vitest";
import { AioApp } from "@aio-ui/app";

/**
 * The theme facade is registration plus one navigation call. `mount()` needs a real
 * container, so this suite pins the DOM-free half — queueing, reading, and the fallback
 * path when no router exists. The mounted half (router-driven switch + re-render) is
 * verified in the demo, where an app really is mounted.
 */

function createTheme(id: string) {
  return {
    themeId: id,
    name: id,
    beforePageRender: (pages: any[], menu: any, footer: any) => ({ pages, menu, footer }),
    activate: () => undefined,
    deactivate: () => undefined,
  };
}

function createApp(theme = "default") {
  return new AioApp({ container: "#app", theme, source: { pages: { home: { ".page": {} } } } });
}

describe("AioApp.theme (before mount)", () => {
  it("accepts a theme without needing the port yet", () => {
    const app = createApp();

    expect(() => app.theme.register(createTheme("late") as any)).not.toThrow();
    // Nothing to enumerate before the port exists, and that is not an error.
    expect(app.theme.ids).toEqual([]);
  });

  it("reports the configured theme as current", () => {
    expect(createApp("cyberpunk").theme.current).toBe("cyberpunk");
  });

  it("records a switch directly when there is no router to own the URL", () => {
    const app = createApp("default");

    app.theme.use("cyberpunk");

    expect(app.theme.current).toBe("cyberpunk");
  });

  it("does nothing when switching to the theme already active", () => {
    const app = createApp("default");

    app.theme.use("default");

    expect(app.theme.current).toBe("default");
  });

  it("returns the app, like every other register* method", () => {
    const app = createApp();

    const chained = app.theme.register(createTheme("a") as any);

    expect(chained).toBe(app);
    // The facade is reachable again through the app, so chains stay in one style.
    expect(() => chained.theme.register(createTheme("b") as any)).not.toThrow();
  });
});
