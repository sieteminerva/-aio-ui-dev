// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { AioApp } from "../AioApp";
import type { iPageDefinition, iPagePort } from "../types";

class FakeRegistry {
  static readonly slot = "registry" as const;
  readonly loaded: string[][] = [];
  readonly built: Array<{ name: string; data: any }> = [];

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
  build(name: any, data: any): HTMLElement {
    this.built.push({ name, data });
    const el = document.createElement("section");
    el.id = name;
    return el;
  }
}

class FakeRouter {
  static readonly slot = "router" as const;
  public current = { route: "product", theme: null, fragment: "" };
  public navTarget: string = "";

  parseUrlHash() {
    return this.current;
  }
  navigate(route: string): void {
    this.navTarget = route;
  }
  updateValidRoutes(): void {}
  destroy(): void {}
}

class FakeRenderer {
  static readonly slot = "renderer" as const;
  render(node: any, _renderFn?: any, buildFn?: any): HTMLElement {
    const main = document.createElement("main");
    if (node && typeof node === "object") {
      for (const [, val] of Object.entries(node)) {
        if (val && typeof val === "object" && (val as any).builder) {
          const child = buildFn ? buildFn((val as any).builder, val) : document.createElement("div");
          if (child) main.appendChild(child);
        }
      }
    }
    return main;
  }
}

describe("AioApp — Page Definition (P6)", () => {
  it("derives preload plan from definition requires and registers subroutes", async () => {
    const registry = new FakeRegistry();
    const router = new FakeRouter();
    const container = document.createElement("div");

    let receivedPort: any = null;

    class TestProductController {
      constructor(port: iPagePort) {
        receivedPort = port;
      }
    }

    const productPageDef: iPageDefinition = {
      word: "product",
      routes: [
        { path: "", view: "grid" },
        { path: ":uid", view: "detail" },
      ],
      slots: [{ slot: "grid" }, { slot: "detail" }],
      requires: ["fab-menu", "badge"],
      controller: TestProductController as any,
    };

    const app = new AioApp({
      container,
      defaultRoute: "product",
      source: { pages: {} },
    });

    app.registerModule(registry).registerModule(router).registerModule(FakeRenderer).registerPage(productPageDef);

    // Verify sub-routes registered
    expect(app.routes).toContain("product");
    expect(app.routes).toContain("product/:uid");

    await app.render();

    // Verify preload derived from word + requires
    expect(registry.loaded[0]).toEqual(expect.arrayContaining(["product", "fab-menu", "badge"]));

    // Verify restricted port access
    expect(receivedPort).not.toBeNull();
    expect(receivedPort?.route).toBe("product");
    expect((receivedPort as any)?.history).toBeUndefined();
    expect(typeof receivedPort?.navigate).toBe("function");

    // Test port navigate safely delegates to shell router
    receivedPort?.navigate("product/shoes-123");
    expect(router.navTarget).toBe("product/shoes-123");
  });

  it("extracts route params on subroutes and passes them into port", async () => {
    const registry = new FakeRegistry();
    const router = new FakeRouter();
    router.current = { route: "product/item-abc", theme: null, fragment: "desc" };
    const container = document.createElement("div");

    let paramSeen: Record<string, string> = {};

    class DetailController {
      constructor(port: iPagePort) {
        paramSeen = port.params;
      }
    }

    const productPageDef: iPageDefinition = {
      word: "product",
      routes: [
        { path: "", view: "grid" },
        { path: ":uid", view: "detail" },
      ],
      controller: DetailController as any,
    };

    const app = new AioApp({
      container,
      defaultRoute: "product",
      source: { pages: {} },
    });

    app.registerModule(registry).registerModule(router).registerModule(FakeRenderer).registerPage(productPageDef);

    await app.render();

    expect(paramSeen).toEqual({ uid: "item-abc" });
  });
});
