import { describe, expect, it, vi } from "vitest";
import { AppStorage } from "@aio-ui/app";

/**
 * The built-in storage port has no DOM dependency, so the parts that carry real
 * logic (driver guarding) can be tested in Node.
 */
describe("AppStorage", () => {
  it("wraps a driver into the storage port", () => {
    const bag = new Map<string, string>();
    const driver = {
      getItem: (key: string) => bag.get(key) ?? null,
      setItem: (key: string, value: string) => void bag.set(key, value),
    };

    const storage = new AppStorage({ driver });
    storage.set("active_theme", "cyberpunk");

    expect(storage.get("active_theme")).toBe("cyberpunk");
    expect(bag.get("active_theme")).toBe("cyberpunk");
  });

  it("never throws when the driver refuses to persist", () => {
    const driver = {
      getItem: vi.fn(() => {
        throw new Error("SecurityError");
      }),
      setItem: vi.fn(() => {
        throw new Error("QuotaExceededError");
      }),
    };

    const storage = new AppStorage({ driver });

    expect(() => storage.set("active_theme", "default")).not.toThrow();
    expect(storage.get("active_theme")).toBeNull();
  });

  it("falls back to memory when no driver is registered", () => {
    const storage = new AppStorage();

    expect(storage.get("active_theme")).toBeNull();

    storage.set("active_theme", "neon");
    expect(storage.get("active_theme")).toBe("neon");
  });

  it("declares the slot it fills", () => {
    expect(AppStorage.slot).toBe("storage");
  });
});
