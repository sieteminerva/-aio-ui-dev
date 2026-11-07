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

## Schema (`fields`)

Confirmed present on a live deployment: one descriptor per column, in sheet order.

```json
{ "title": "ImageUrl", "type": "file",
  "config": { "sheet": 2128641545, "cell": "I1" }, "hasTranslation": true }
{ "title": "Segment", "type": "select", "required": true, "range": "SegmentRange",
  "placeholder": "Select an option",
  "config": { "sheet": 2128641545, "cell": "B1", "options": ["intro", "portfolio"] } }
{ "title": "timestamp", "type": "text",
  "config": { "skipped": true, "sheet": 2128641545, "cell": "A1" } }
```

Observed properties of the schema:

- `title` keeps the original header text; record keys are a separate normalisation.
- `required` is sometimes `false`, sometimes absent — treat both as "not required".
- `range` is echoed from the note and also resolved into `config.options`.
- `config.skipped` marks a column hidden from the generated form. It is **not** a privacy
  flag: skipped columns are still returned in `data` by design.
- `config.sheet` / `config.cell` are storage addresses and should not be shipped to a
  public browser payload.

## Conventions to know

### Record keys are not reversible from `title`

The server splits on non-alphanumerics, lowercases the first token and capitalises the
rest. A single PascalCase token is lowercased whole:

| Header | Record key |
| --- | --- |
| `Email Address` | `emailAddress` |
| `ImageUrl` | `imageurl` |
| `UUID` | `uuid` |
| `timestamp` | `timestamp` |

So `ImageUrl` and `Image URL` produce different keys. Writing headers with spaces
(`Image Url`) yields the intended `imageUrl`. The frontend must reuse this exact rule
rather than guess from `title`.

### Empty cells are omitted

Records do not contain a key whose cell is empty, so a record is not a dense row.
Consumers must treat every key as optional.

### `file` columns hold a URL list

One or more Drive URLs joined by `", "`. Split before use; keep the order.

## Server-side todos (out of scope until we work on GAS)

1. Errors thrown before the response builder returns an HTML page, not JSON.
   Wrap `doGet` / `doPost` so clients never receive HTML.
2. Decide whether `config.sheet` / `config.cell` should be stripped from public responses.
3. Default ordering is the identifier column ascending, not `timestamp`; confirm that is
   the intended reading order for generated pages.
