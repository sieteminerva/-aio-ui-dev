// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";

import { IdAddressBuilder } from "../id-address-builder";

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

/** Let the microtask queue drain: the cascade is a chain of awaited hops. */
const flush = async (times = 4) => {
  for (let i = 0; i < times; i++) await new Promise((resolve) => setTimeout(resolve, 0));
};

const LEVELS = ["propinsi", "kota", "kecamatan", "kelurahan"] as const;

function markup(): HTMLElement {
  const container = document.createElement("div");
  container.innerHTML = [
    ...LEVELS.map((level) => `<select data-level="${level}"><option value="">Pilih ${level}</option></select>`),
    `<input data-level="kodepos" />`,
  ].join("");
  document.body.appendChild(container);
  return container;
}

const field = (container: HTMLElement, level: string) =>
  container.querySelector(`[data-level="${level}"]`) as HTMLSelectElement;

const DETAIL = {
  propinsi_id: "31", propinsi_name: "DKI JAKARTA",
  kota_id: "3171", kota_name: "JAKARTA SELATAN",
  kecamatan_id: "317101", kecamatan_name: "KEBAYORAN BARU",
  kelurahan_id: "3171011001", kelurahan_name: "SENAYAN",
  kodepos_id: "12190", kodepos_name: 12345,
};

describe("IdAddress kodepos lookup state", () => {
  it("clears and flags the chain while the new code is still resolving", async () => {
    const container = markup();
    let release: (rows: any[]) => void = () => undefined;
    const pending = new Promise<any[]>((resolve) => { release = resolve; });

    const loader = vi.fn(async (query: any) => {
      if (query.level === "detail") return pending;
      // A level returns the very rows the detail promised for it.
      return [{ [`${query.level}_id`]: (DETAIL as any)[`${query.level}_id`], [`${query.level}_name`]: (DETAIL as any)[`${query.level}_name`] }];
    });

    const builder = new IdAddressBuilder({ container, loader } as any);
    builder.init();
    await flush();

    const propinsi = field(container, "propinsi");
    expect(propinsi.options).toHaveLength(2); // placeholder + the real province

    const kodepos = container.querySelector('[data-level="kodepos"]') as HTMLInputElement;
    kodepos.value = "12345";
    kodepos.dispatchEvent(new Event("input"));

    // Before the round trip resolves, the old address must be gone, not left on screen.
    expect(propinsi.classList.contains("loading")).toBe(true);
    expect(propinsi.options).toHaveLength(1);
    expect(propinsi.options[0].textContent).toContain("Loading propinsi");
    expect(propinsi.value).toBe("");
    expect(field(container, "kota").classList.contains("loading")).toBe(true);

    release([DETAIL]);
    await flush(8);

    // …and afterwards the chain is filled top-down, without the spinner.
    expect(propinsi.classList.contains("loading")).toBe(false);
    expect(propinsi.value).toBe("31");
    expect(field(container, "kota").value).toBe("3171");
    expect(field(container, "kecamatan").value).toBe("317101");
    expect(field(container, "kelurahan").value).toBe("3171011001");
    expect(builder.detail.kodepos_id).toBe("12190");
  });

  it("releases the levels the lookup could not fill, instead of spinning forever", async () => {
    const container = markup();

    const loader = vi.fn(async (query: any) => {
      if (query.level === "detail") {
        // A parent the data knows, but no district under it.
        return [{ propinsi_id: "31", propinsi_name: "DKI JAKARTA", kota_id: "3171", kota_name: "JAKARTA SELATAN", kodepos_id: "12190", kodepos_name: 12345 }];
      }
      return [{ [`${query.level}_id`]: (DETAIL as any)[`${query.level}_id`], [`${query.level}_name`]: (DETAIL as any)[`${query.level}_name`] }];
    });

    const builder = new IdAddressBuilder({ container, loader } as any);
    builder.init();
    await flush();

    const kodepos = container.querySelector('[data-level="kodepos"]') as HTMLInputElement;
    kodepos.value = "12190";
    kodepos.dispatchEvent(new Event("input"));
    await flush(8);

    const kecamatan = field(container, "kecamatan");
    expect(kecamatan.classList.contains("loading")).toBe(false);
    expect(kecamatan.options[0].textContent).toBe("Pilih kecamatan");
    expect(field(container, "propinsi").value).toBe("31");
    expect(field(container, "kota").value).toBe("3171");
  });

  it("does not leave a level stuck on its loading label when it answers empty", async () => {
    const container = markup();

    const loader = vi.fn(async (query: any) => {
      if (query.level === "detail") return [DETAIL];
      // The detail names a district, but the endpoint has no rows for it.
      if (query.level === "kecamatan") return [];
      return [{ [`${query.level}_id`]: (DETAIL as any)[`${query.level}_id`], [`${query.level}_name`]: (DETAIL as any)[`${query.level}_name`] }];
    });

    const builder = new IdAddressBuilder({ container, loader } as any);
    builder.init();
    await flush();

    const kodepos = container.querySelector('[data-level="kodepos"]') as HTMLInputElement;
    kodepos.value = "12190";
    kodepos.dispatchEvent(new Event("input"));
    await flush(8);

    const kecamatan = field(container, "kecamatan");
    expect(kecamatan.classList.contains("loading")).toBe(false);
    // Not "Loading kecamatan": an empty answer is an idle level, not a busy one.
    expect(kecamatan.options[0].textContent).toBe("Pilih kecamatan");
    expect(field(container, "kota").value).toBe("3171");
  });
});
