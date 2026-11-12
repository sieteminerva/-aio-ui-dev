# HttpService (`@aio-ui/http-service`)

The `http` slot — the one door for data. A controller receives it as `ctx.http`, so no page
calls `fetch` or imports a JSON file directly, and moving to a real backend is a config change.

## Payload

| Method              | Signature                          | Resolves with                                    |
| ------------------- | ---------------------------------- | ------------------------------------------------ |
| `get(query)`        | `(query: any) => Promise<any>`     | the **whole envelope** `{ success, message, data, meta }` |
| `post(query, body)` | `(query, payload) => Promise<any>` | the same envelope                                |

`meta` is part of the result on purpose: pagination needs it, and a legacy
`{ status: "success" }` payload is still accepted.

## Config

| Option         | Default    | Meaning                                                     |
| -------------- | ---------- | ----------------------------------------------------------- |
| `url`          | `""`       | Base URL of the backend                                      |
| `endpoint`     | —          | Builds the URL per query; this is how mock JSON stays a real request |
| `timeout`      | `10000`    | Request timeout in ms                                        |
| `delay`        | `1000`     | Artificial delay, so a cached answer still looks like a request |
| `cacheEnabled` | `false`    | Cache responses in `localStorage`                            |
| `cachePrefix`  | `"app"`    | Cache key prefix                                             |
| `cacheTtlDays` | `1`        | Cache lifetime in days                                       |
| `debug`        | `false`    | Print request/response diagnostics — silent by default       |

## Nodes

None — a data module renders nothing.

## Tokens

None.

## Wiring checklist

1. `.registerModule(HttpService, { url: "/api" })` for a real backend.
2. For static JSON, keep `url: ""` and pass an `endpoint`:
   ```ts
   { endpoint: (q) => `${import.meta.env.BASE_URL}mock/${q.sheetName}.json` }
   ```
3. Read `ctx.http` in the controller — never import the service directly.
4. `destroy()` aborts in-flight requests; the app calls it for you.
