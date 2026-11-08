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
