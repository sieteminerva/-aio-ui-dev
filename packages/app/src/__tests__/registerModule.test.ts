import { describe, expect, it, vi } from "vitest";
import { AioApp } from "@aio-ui/app";

/**
 * Registration is pure: it never touches the DOM, so its rules can be pinned down
 * without mounting. Anything that needs a container belongs to `render()`.
 */
function createApp() {
  return new AioApp({ container: "#app", source: { pages: { home: { ".page": {} } } } });
}

describe("AioApp.registerModule", () => {
  it("reads the slot from a class instead of an identifier argument", () => {
    class FakeRouter {
      static readonly slot = "router" as const;
      navigate() { }
      parseUrlHash() {
        return { route: "home", theme: null, fragment: "" };
      }
      updateValidRoutes() { }
      destroy() { }
    }

    expect(() => createApp().registerModule(FakeRouter)).not.toThrow();
  });

  it("reads the slot from an instance's constructor", () => {
    class FakeStorage {
      static readonly slot = "storage" as const;
      get() {
        return null;
      }
      set() { }
    }

    expect(() => createApp().registerModule(new FakeStorage())).not.toThrow();
  });

  it("accepts a plain object when the slot is given explicitly", () => {
    const fakeAnimation = { init: () => undefined };

    expect(() => createApp().registerModule(fakeAnimation, "animation")).not.toThrow();
  });

  it("refuses a module whose slot cannot be determined", () => {
    expect(() => createApp().registerModule({ init: () => undefined } as any)).toThrow(
      /Cannot tell which slot/i
    );
  });

  it("warns and replaces when a slot is registered twice", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const first = { init: () => undefined };
    const second = { init: () => undefined };

    createApp().registerModule(first, "animation").registerModule(second, "animation");

    expect(warn).toHaveBeenCalledWith(expect.stringContaining('Slot "animation"'));
    warn.mockRestore();
  });
});
