// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { Builder } from "../Base";

class HostBuilder extends Builder<"@host" | "@host>slotA", any> {
  readonly builderId = "table" as const;
  readonly name = "table" as const;
  readonly stylesheet = "" as const;
  public config: any;

  constructor(config: any = {}) {
    super();
    this.config = this.resolveConfig(
      {
        themeId: "default",
        namespace: null,
        emit: () => {},
        selectors: {
          "@host": { tagName: "div", className: "host-root" },
          "@host>slotA": { tagName: "div", className: "slot-a-placeholder", attrs: { "data-custom": "hello" } },
        },
        slots: {
          "@host>slotA": "slot-a",
        },
      },
      config
    );
  }

  public prepare(): HTMLElement {
    const root = this.render("@host")!;
    const slotA = this.render("@host>slotA")!;
    root.appendChild(slotA);
    return root;
  }

  protected template() {}

  public initialize() {}
}

class ChildBuilder extends Builder<"@child", any> {
  readonly builderId = "table" as const;
  readonly name = "table" as const;
  readonly stylesheet = "" as const;
  public initialized = false;
  public config: any;

  constructor(config: any = {}) {
    super();
    this.config = this.resolveConfig(
      {
        themeId: "default",
        namespace: null,
        emit: () => {},
        selectors: {
          "@child": { tagName: "section", className: "child-section" },
        },
        slots: {},
      },
      config
    );
  }

  public prepare(): HTMLElement {
    return this.render("@child")!;
  }

  protected template() {}

  public initialize() {
    this.initialized = true;
  }
}

describe("Builder explicit slot door: host() / project() / detach()", () => {
  it("locates receptacle with host()", () => {
    const host = new HostBuilder({
      slots: { slotA: "slot-a" },
    });
    const root = host.create({});
    expect(root).toBeTruthy();
    const receptacle = host.host("slot-a");

    expect(receptacle).not.toBeNull();
    expect(receptacle?.getAttribute("data-slot")).toBe("slot-a");
    expect(receptacle?.classList.contains("slot-a-placeholder")).toBe(true);
  });

  it("projects a DOM element, inherits classes and non-style attrs, and detaches back", () => {
    const host = new HostBuilder({
      slots: { slotA: "slot-a" },
    });
    const root = host.create({});

    const childEl = document.createElement("p");
    childEl.className = "injected-p";
    childEl.textContent = "I am projected child";

    const projected = host.project("slot-a", childEl);
    expect(projected).toBe(childEl);
    expect(root.querySelector(".injected-p")).toBe(childEl);
    // Welded attributes & classes from receptacle
    expect(childEl.classList.contains("slot-a-placeholder")).toBe(true);
    expect(childEl.classList.contains("injected-p")).toBe(true);
    expect(childEl.getAttribute("data-custom")).toBe("hello");
    expect(childEl.getAttribute("data-slot")).toBe("slot-a");

    // Detach restores original receptacle
    host.detach("slot-a");
    expect(root.querySelector(".injected-p")).toBeNull();
    const restored = host.host("slot-a");
    expect(restored).not.toBeNull();
    expect(restored?.classList.contains("slot-a-placeholder")).toBe(true);
  });

  it("projects another Builder directly without implicit #active caller", () => {
    const host = new HostBuilder({
      slots: { slotA: "slot-a" },
    });
    const root = host.create({});

    const child = new ChildBuilder({});
    const projected = host.project("slot-a", child);

    expect(projected).not.toBeNull();
    expect(child.initialized).toBe(true);
    expect(projected?.tagName.toLowerCase()).toBe("section");
    expect(projected?.classList.contains("slot-a-placeholder")).toBe(true);
    expect(projected?.classList.contains("child-section")).toBe(true);
    expect(root.querySelector("section.child-section")).toBe(projected);

    host.detach("slot-a");
    expect(root.querySelector("section.child-section")).toBeNull();
    expect(host.host("slot-a")).not.toBeNull();
  });
});
