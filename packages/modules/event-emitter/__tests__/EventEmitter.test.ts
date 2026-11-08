import { describe, expect, it, vi } from "vitest";
import { EventEmitter } from "@aio-ui/event-emitter";

describe("EventEmitter", () => {
  it("delivers a known page event to every subscriber", () => {
    const emitter = new EventEmitter();
    const first = vi.fn();
    const second = vi.fn();

    emitter.on("ready", first);
    emitter.on("ready", second);
    emitter.emit("ready", { route: "home", shell: {} as HTMLElement, elements: new Map(), sequence: 1 });

    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
  });

  it("accepts a component's own event name without registration", () => {
    const emitter = new EventEmitter();
    const listener = vi.fn();

    emitter.on("formValidation", listener);
    emitter.emit("formValidation", { valid: false, field: "email" });

    expect(listener).toHaveBeenCalledWith({ valid: false, field: "email" });
  });

  it("keeps going when a listener throws", () => {
    const emitter = new EventEmitter();
    const after = vi.fn();
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    emitter.on("elementAdded", () => {
      throw new Error("listener exploded");
    });
    emitter.on("elementAdded", after);

    expect(() => emitter.emit("elementAdded", { element: {} as HTMLElement })).not.toThrow();
    expect(after).toHaveBeenCalledTimes(1);
    expect(consoleError).toHaveBeenCalled();

    consoleError.mockRestore();
  });

  it("stops delivering to a listener after off()", () => {
    const emitter = new EventEmitter();
    const listener = vi.fn();

    emitter.on("pageChanged", listener);
    emitter.off("pageChanged", listener);
    emitter.emit("pageChanged", { route: "home", previous: null });

    expect(listener).not.toHaveBeenCalled();
  });

  it("can be handed to the registry as the component publisher", () => {
    const emitter = new EventEmitter();
    const listener = vi.fn();

    emitter.on("elementChanged", listener);
    emitter.emit("elementChanged", { builder: "product-card", element: null });

    expect(listener).toHaveBeenCalledTimes(1);
  });
});
