# CMS API Contract

Observed from the redeployed endpoint:

```txt
GET <exec-url>?sheetName=<sheet>&limit=<n>&page=<n>&lang=<code>&category=<value>&sortBy=<key>&order=asc|desc&apiKey=<key>
```

## Response (as deployed)

```json
{
  "success": true,
  "message": "Data retrieved successfully.",
  "data": [ { "timestamp": "2026-05-30T16:28:56.000Z", "segment": "portfolio", "...": "..." } ],
  "meta": {
    "totalItems": 14, "itemsPerPage": 10, "currentPage": 1, "totalPages": 2,
    "links": { "self": "?limit=10&order=asc&page=1", "next": "?limit=10&order=asc&page=2", "prev": null }
  }
}
```

Facts consumers can rely on:

- Keys are lower-camel normalised server-side; dates are ISO strings.
- `meta.links` are relative to the deployment URL.
- Default ordering is the identifier column (uuid) ascending, not by timestamp.
- A `file` column holds one or more Drive URLs joined by `", "`.

## Deviations from the intended contract

### 1. `fields` is missing

`GvizService.paginate()` returns

```js
fields: this.headers[targetSheetName]
```

but `this.headers` is already **the field array for the requested sheet**
(`options.headersSchema`), not a map keyed by sheet name. Indexing an array with a
string yields `undefined`, and `JSON.stringify` drops the key, so the schema never
reaches the client.

Fix: `fields: this.headers` (as `paginateManualLoad()` already does at its own return).

Consequence for the frontend: `iApiResponse.fields` is declared optional, and the shell
must work without it until the deployment is fixed.

### 2. Header casing collapses inside a word

`"Email Address"` → `emailAddress`, but `"ImageUrl"` → `imageurl`.

Normalisation only splits on separators, so `ImageUrl` is treated as one lowercase token.
Either write headers with separators (`Image Url`) or make the converter split on case
boundaries. Until then, record keys are **not** predictable from a header written in
PascalCase, and `fields[].title` cannot be mapped to a key without replicating the exact
same algorithm.

### 3. System columns still reach the client

`skipHeaders` (`timestamp`, `uuid`, `email address`) removes columns from `fields` only.
`data` is produced by `select("*")`, so `emailAddress` is returned in full.

For a public site that is a privacy leak. Recommendation: the public response should drop
columns whose note has `config.skipped` or a future `system` flag, while keeping `uuid`
and `timestamp` (needed for keys and ordering).

### 4. Errors return HTML, not JSON

An exception thrown before the response builder is used returns a Google error page.
Clients then fail with `Unexpected token '<'` and render nothing, with no visible cause.
Wrap `doGet` / `doPost` in one `try/catch` that always responds through
`APIService.createResponse`.

## Consumer rules

1. Never assume `fields` exists.
2. Never assume a header maps to a key by a rule other than the server's converter.
3. Split `file` values on `", "`; treat the result as an ordered list.
4. Treat `meta.links` as relative.
5. A missing block source must degrade to an empty render with a reported warning, never a
   thrown exception.
