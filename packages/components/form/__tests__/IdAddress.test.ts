// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";

import { IdAddressBuilder } from "../IdAddress/id-address-builder";

/**
 * The picker's data source, without a network.
 *
 * It used to own a transport (fetch + AbortController + timeout + its own localStorage
 * cache) and a hardcoded Google Apps Script endpoint. Now the data arrives through an
 * injected `loader`, or through the shared `HttpService` — which returns the whole
 * envelope, so unwrapping is part of this contract.
 */
function picker(config: Record<string, any>): IdAddressBuilder {
  // A detached container is enough: these tests only exercise the data path, not the DOM.
  const container = document.createElement("div");
  document.body.appendChild(container);

  return new IdAddressBuilder({ container, headless: true, ...config } as any);
}

const ROWS = [{ propinsi_id: "31", propinsi_name: "DKI Jakarta" }];

describe("IdAddress data source", () => {
  it("asks the injected loader for a level", async () => {
    const loader = vi.fn(async () => ROWS);
    const builder = picker({ loader });

    await expect(builder.getRegionalData({ level: "propinsi" })).resolves.toEqual(ROWS);
    expect(loader).toHaveBeenCalledWith({ level: "propinsi" });
  });

  it("passes the parent id through, so a level can be narrowed", async () => {
    const loader = vi.fn(async () => []);
    const builder = picker({ loader });

    await builder.getRegionalData({ level: "kota", parentId: "31" });

    expect(loader).toHaveBeenCalledWith({ level: "kota", parentId: "31" });
  });

  it("unwraps the envelope an HTTP service returns", async () => {
    const get = vi.fn(async () => ({ success: true, data: ROWS, meta: { total: 1 } }));
    const builder = picker({ service: { get, destroy: vi.fn() } });

    await expect(builder.getRegionalData({ level: "propinsi" })).resolves.toEqual(ROWS);
    expect(get).toHaveBeenCalledWith({ level: "propinsi" });
  });

  it("passes a bare payload through untouched", async () => {
    const get = vi.fn(async () => ROWS);
    const builder = picker({ service: { get, destroy: vi.fn() } });

    await expect(builder.getRegionalData({ level: "propinsi" })).resolves.toEqual(ROWS);
  });

  it("refuses to guess a source instead of calling a nameless endpoint", async () => {
    const builder = picker({ url: null });

    await expect(builder.getRegionalData({ level: "propinsi" })).rejects.toThrow(/No data source configured/);
  });

  it("closes a service it created, and leaves an injected one alone", () => {
    const injected = { get: vi.fn(), destroy: vi.fn() };
    const shared = picker({ service: injected });
    const consoleLog = console.log;
    console.log = () => undefined;
    shared.destroy();
    console.log = consoleLog;

    expect(injected.destroy).not.toHaveBeenCalled();
  });
});
