import { afterEach, describe, expect, it, vi } from "vitest";
import { HttpService } from "@aio-ui/http-service";

/** Minimal `Response` stand-in: only what the service actually reads. */
function jsonResponse(body: unknown, ok = true) {
  return { ok, status: 200, statusText: ok ? "OK" : "Bad Request", json: async () => body };
}

function stubFetch(body: unknown, ok = true) {
  const fetchMock = vi.fn(async (_url: unknown, _options?: unknown) => jsonResponse(body, ok) as unknown as Response);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => vi.unstubAllGlobals());

describe("HttpService", () => {
  it("lets the host decide the URL, so a mock can serve static JSON", async () => {
    const fetchMock = stubFetch({ success: true, data: [], meta: {} });
    const http = new HttpService({ endpoint: (q) => `/mock/${q.sheetName}.json` });

    await http.get({ sheetName: "blog" });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toBe("/mock/blog.json");
  });

  it("returns the whole envelope, because consumers need meta for pagination", async () => {
    stubFetch({ success: true, data: [{ id: 1 }], meta: { totalItems: 1 } });
    const http = new HttpService({ url: "/api" });

    const res = await http.get({ sheetName: "blog" });

    expect(res.data).toEqual([{ id: 1 }]);
    expect(res.meta).toEqual({ totalItems: 1 });
  });

  it("also accepts the legacy status envelope", async () => {
    stubFetch({ status: "success", data: [{ id: 2 }] });
    const http = new HttpService({ url: "/api" });

    await expect(http.get({ sheetName: "blog" })).resolves.toMatchObject({ status: "success" });
  });

  it("rejects when the payload reports failure", async () => {
    stubFetch({ success: false, message: "Sheet not found" });
    const http = new HttpService({ url: "/api" });

    await expect(http.get({ sheetName: "nope" })).rejects.toThrow("Sheet not found");
  });

  it("builds a query string when no endpoint is given", async () => {
    const fetchMock = stubFetch({ success: true, data: [] });
    const http = new HttpService({ url: "/api/" });

    await http.get({ sheetName: "blog", page: 2 });

    expect(String(fetchMock.mock.calls[0][0])).toBe("/api?sheetName=blog&page=2");
  });
});

/** Node suite: a two-line storage stand-in so the cache path can be exercised. */
function stubStorage(): { store: Map<string, string> } {
  const store = new Map<string, string>();
  (globalThis as any).localStorage = {
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    setItem: (key: string, value: string) => void store.set(key, String(value)),
    removeItem: (key: string) => void store.delete(key),
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
  };
  return { store };
}

describe("HttpService cache identity", () => {
  it("does not serve one query's rows for another query with the same shape", async () => {
    stubStorage();
    const service = new HttpService({ url: "https://example.test/api", cacheEnabled: true });
    const calls: any[] = [];

    // Bypass the network: record the query and answer with it, so a cached answer is
    // obvious (it would come back without a second call).
    (service as any)._fetchAPI = async (query: any) => {
      calls.push(query);
      return { success: true, data: [String(query.parentId)] };
    };

    const province = await service.get({ level: "propinsi" });
    const city = await service.get({ level: "kota", parentId: 12 });
    const district = await service.get({ level: "kecamatan", parentId: 3273 });

    expect(calls).toHaveLength(3);
    expect(city).not.toEqual(province);
    expect(district).not.toEqual(city);
    localStorage.clear();
  });

  it("still answers the same question from cache", async () => {
    stubStorage();
    const service = new HttpService({ url: "https://example.test/api", cacheEnabled: true });
    let calls = 0;
    (service as any)._fetchAPI = async () => {
      calls++;
      return { success: true, data: ["once"] };
    };

    await service.get({ level: "kota", parentId: 12 });
    await service.get({ parentId: 12, level: "kota" });

    expect(calls).toBe(1);
    localStorage.clear();
  });
});
