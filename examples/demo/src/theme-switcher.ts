import type { iNodeContent } from "@aio-ui/core/interface";

/**
 * Theme switcher — wired into a fab menu, as the app's floating chrome.
 *
 * It is a *host* concern, not a component concern: switching the theme is a route change
 * carrying another `?theme=` value. `HashRouter` parses it, `AioApp` compares it with the
 * current theme, calls `ThemeRenderer.use()` and re-renders the route — so the switcher
 * only has to move the hash. No framework API is invented for it.
 */

/** Must match the themes registered in `main.ts`. */
export const THEMES = ["default", "cyberpunk"] as const;

export type ThemeId = (typeof THEMES)[number];

const LABELS: Record<ThemeId, string> = {
  default: "Default",
  cyberpunk: "Cyberpunk",
};

/** `#product?theme=cyberpunk`, keeping every other query parameter intact. */
export function hashWithTheme(themeId: string): string {
  const raw = location.hash.replace(/^#/, "") || "kitchen";
  const [path, queryString = ""] = raw.split("?");
  const params = new URLSearchParams(queryString);
  params.set("theme", themeId);
  return `#${path}?${params.toString()}`;
}

/** The theme the current URL asks for. */
export function currentTheme(): string {
  const queryString = location.hash.split("?")[1] ?? "";
  return new URLSearchParams(queryString).get("theme") ?? "default";
}

/**
 * A page-level node that mounts the switcher. Included on every route so the control is
 * always reachable; the active theme is marked with `isActive`, so the menu shows which
 * one you are on.
 */
export const themeSwitcher = {
  ".theme-switcher": {
    onCreated: (el: HTMLElement, _render: any, build: any) => {
      const active = currentTheme();

      const menu = build("fab-menu", {
        schema: {
          title: "Tema",
          actions: THEMES.map((id) => ({
            id: `theme-${id}`,
            label: LABELS[id],
            isActive: id === active,
            onClick: () => {
              if (currentTheme() === id) return;

              // Preferred door: `app.theme.use()`. The app forwards it to the router, so the
              // URL, storage and re-render all follow the normal path. The demo keeps its app
              // handle on `globalThis` (see main.ts), which is exactly what a host has.
              const app = (globalThis as any).__app;
              if (typeof app?.theme?.use === "function") {
                app.theme.use(id);
                return;
              }

              // Fallback for a page without an app handle: a hash change is enough, the
              // router parses `?theme=` and the app takes it from there.
              location.hash = hashWithTheme(id);
            },
          })),
        },
        config: {
          position: "bottom-right",
          displayIcon: "🎨",
          // The menu is a control, not a menu of destinations: keep it open while the
          // visitor compares themes, then let the idle timer close it.
          closeOnSelected: false,
        },
      });

      el.mount(menu);
    },
  },
} as unknown as iNodeContent;
