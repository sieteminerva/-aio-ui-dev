// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { AioApp } from "../AioApp";
import type { iComponentRoute, iPageController, iPageContext } from "../types";

/**
 * The route component plan: what each route mounts is declared once, where the registry
 * is registered — so a node's `builder` keeps its single meaning.
 */

class FakeRegistry {
  static readonly slot = "registry" as const;
  readonly loaded: string[][] = [];

  has(): boolean {
    return true;
  }
  getRegisteredNames(): string[] {
    return [];
  }
  collect(): string[] {
    return [];
  }
  async load(names: string[]): Promise<void> {
    this.loaded.push(names);
  }
  build(): HTMLElement {
    return document.createElement("section");
  }
}

class FakeRouter {
  static readonly slot = "router" as const;
  parseUrlHash() {
    return { route: "blog", theme: null, fragment: "" };
  }
  navigate(): void { }
  updateValidRoutes(): void { }
  destroy(): void { }
}

class FakeRenderer {
  static readonly slot = "renderer" as const;
  render(): HTMLElement {
    return document.createElement("main");
  }
}

function appWith(plan: iComponentRoute[]): { app: AioApp; registry: FakeRegistry; container: HTMLElement } {
  const registry = new FakeRegistry();
  const container = document.createElement("div");
  const app = new AioApp({
    container,
    defaultRoute: "blog",
    source: { pages: { blog: { ".page": { content: "x" } } } },
  });

  app.registerModule(registry, plan).registerModule(FakeRouter).registerModule(FakeRenderer);

  return { app, registry, container };
}

describe("AioApp — route component plan", () => {
  it("preloads the declared components of the route being rendered", async () => {
    const { app, registry } = appWith([{ route: "  #Blog/ ", components: ["article", "fab-menu"] }]);

    await app.render();

    expect(registry.loaded).toEqual([["article", "fab-menu"]]);
  });

  it("merges the plan with the components declared in content, without duplicates", async () => {
    const registry = new FakeRegistry();
    registry.collect = () => ["post", "fab-menu"];

    const app = new AioApp({
      container: document.createElement("div"),
      defaultRoute: "blog",
      source: { pages: { blog: { ".page": { content: "x" } } } },
    })
      .registerModule(registry, [{ route: "blog", components: ["article", "fab-menu"] }, { route: "BLOG", components: ["post"] }])
      .registerModule(FakeRouter)
      .registerModule(FakeRenderer);

    await app.render();

    expect(registry.loaded).toEqual([["article", "fab-menu", "post"]]);
  });

  it("hands the plan to the page controller as its builder list", async () => {
    let seen: string[] = [];

    class Capturing implements iPageController {
      constructor(_config: unknown, context: iPageContext) {
        seen = context.builders;
      }
    }

    const app = new AioApp({
      container: document.createElement("div"),
      defaultRoute: "blog",
      source: { pages: {} },
    })
      .registerModule(new FakeRegistry(), [{ route: "blog", components: ["article"] }])
      .registerModule(FakeRouter)
      .registerModule(FakeRenderer)
      .registerPage("blog", Capturing);

    await app.render();

    expect(seen).toEqual(["article"]);
  });

  it("rejects a plan on a slot that does not resolve components", () => {
    const app = new AioApp({ container: document.createElement("div"), source: { pages: {} } });

    expect(() => app.registerModule(new FakeRouter(), [{ route: "blog", components: [] }])).toThrow(
      /belongs to the "registry" slot/
    );
  });

  it("rejects a malformed entry instead of silently preloading nothing", () => {
    const app = new AioApp({ container: document.createElement("div"), source: { pages: {} } });

    expect(() => app.registerModule(new FakeRegistry(), [{ route: "blog" } as any])).toThrow(
      /needs \{ route, components: \[\] \}/
    );
  });
});
