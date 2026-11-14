// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AioApp } from "../AioApp";
import type { iPageController } from "../types";

/**
 * Teardown on a *fragment* switch.
 *
 * `#kitchen/a → #kitchen/b` is one route with two fragments: the router reports the same
 * route name, so the old rule ("release only when the name changes") re-created the
 * controller and dropped the previous one without ever calling `onDestroy`. Nothing
 * destroyed the page's builders either, which is what left every leak in
 * `docs/framework/APP-LIFECYCLE.md` running after its DOM was gone.
 *
 * Two mechanisms are pinned here:
 *
 * 1. the outgoing controller is released on **every** replacing pass;
 * 2. the outgoing shell is handed to `releaseBuilders` at paint time — and only there,
 *    so a failed pass leaves the previous page on screen *and* working.
 */

class FakeRegistry {
  static readonly slot = "registry" as const;
  static last: FakeRegistry;

  readonly built: string[] = [];
  readonly released: Array<ParentNode | null> = [];
  failBuild = false;

  constructor() {
    FakeRegistry.last = this;
  }
  has(): boolean {
    return true;
  }
  getRegisteredNames(): string[] {
    return [];
  }
  collect(): string[] {
    return [];
  }
  async load(): Promise<void> { }
  build(name: string): HTMLElement {
    if (this.failBuild) throw new Error("builder refused");
    this.built.push(name);
    const element = document.createElement("section");
    element.setAttribute("data-built", name);
    return element;
  }
  releaseBuilders(root: ParentNode | null): number {
    this.released.push(root);
    return 0;
  }
}

class FakeRouter {
  static readonly slot = "router" as const;
  static last: FakeRouter;

  public current = { route: "kitchen", theme: null as string | null, fragment: "badge" };
  public onRouteChanged!: (state: { route: string; theme: string | null; fragment: string }) => Promise<void>;

  constructor(_config: unknown, context: { onRouteChanged: FakeRouter["onRouteChanged"] }) {
    FakeRouter.last = this;
    this.onRouteChanged = context.onRouteChanged;
  }
  parseUrlHash() {
    return { ...this.current };
  }
  navigate(): void { }
  updateValidRoutes(): void { }
  destroy(): void { }
}

class FakeRenderer {
  static readonly slot = "renderer" as const;

  render(node: any, _renderFn?: any, buildFn?: any): HTMLElement {
    const main = document.createElement("main");
    if (node && typeof node === "object") {
      for (const value of Object.values(node)) {
        if (value && typeof value === "object" && (value as any).builder) {
          main.appendChild(buildFn((value as any).builder, value));
        }
      }
    }
    return main;
  }
}

let destroyed: string[];
let container: HTMLElement;

function mountApp(): AioApp {
  container = document.createElement("div");
  document.body.appendChild(container);
  destroyed = [];

  class Kitchen implements iPageController {
    onDestroy(): void {
      destroyed.push("kitchen");
    }
  }

  const app = new AioApp({
    container,
    defaultRoute: "kitchen",
    source: { pages: { kitchen: { main: { builder: "panel" } } } },
  });
  app.registerModule(FakeRegistry).registerModule(FakeRouter).registerModule(FakeRenderer);
  app.registerPage("kitchen", Kitchen as any);
  return app;
}

beforeEach(() => {
  FakeRegistry.last = undefined as unknown as FakeRegistry;
  FakeRouter.last = undefined as unknown as FakeRouter;
});

afterEach(() => {
  document.body.replaceChildren();
});

describe("AioApp — teardown", () => {
  it("releases the outgoing controller when only the fragment changes", async () => {
    const app = mountApp();

    await app.render();
    expect(destroyed).toEqual([]);
    expect(FakeRegistry.last.built).toEqual(["panel"]);

    await FakeRouter.last.onRouteChanged({ route: "kitchen", theme: null, fragment: "carousel" });

    expect(destroyed).toEqual(["kitchen"]);
    expect(FakeRegistry.last.built).toEqual(["panel", "panel"]);
  });

  it("hands the outgoing shell to releaseBuilders at paint time", async () => {
    const app = mountApp();

    await app.render();
    const firstShell = container.firstElementChild;
    expect(firstShell).not.toBeNull();
    expect(FakeRegistry.last.released).toEqual([]);

    await FakeRouter.last.onRouteChanged({ route: "kitchen", theme: null, fragment: "carousel" });

    expect(FakeRegistry.last.released).toEqual([firstShell]);
    expect(container.firstElementChild).not.toBe(firstShell);
  });

  it("keeps the old page mounted and untouched when the next pass fails", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => { });
    const app = mountApp();

    await app.render();
    const firstShell = container.firstElementChild;

    FakeRegistry.last.failBuild = true;
    await FakeRouter.last.onRouteChanged({ route: "kitchen", theme: null, fragment: "carousel" });

    // The rule: a broken route must not blank — or kill — the page the visitor is on.
    expect(container.firstElementChild).toBe(firstShell);
    expect(FakeRegistry.last.released).toEqual([]);

    spy.mockRestore();
  });
});
