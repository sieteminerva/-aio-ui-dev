# CHEATSHEET

## 📡 Quick API Reference

### Base URL

```
https://script.google.com/macros/s/{deploymentId}/exec
```

---

## Query Parameters

| Param        | Description                                   |
| :----------- | :-------------------------------------------- |
| `sheet`      | Sheet name to query **(required)**            |
| `apiKey`     | API key (required if configured in Settings)  |
| `page`       | Page number (Default: `1`)                    |
| `limit`      | Items per page (Default: `10`)                |
| `sortBy`     | Column name to sort by                        |
| `order`      | Sort direction: `asc` or `desc`               |
| `lang`       | Target language sheet (e.g., `en`, `id`)      |
| `category`   | Case-insensitive filter for `category` column |
| _any column_ | Any column name works as a filter             |

---

## curl Examples

### GET — Read

```bash
# Basic query
curl "https://script.google.com/macros/s/{id}/exec?sheet=Posts"

# With auth
curl "https://script.google.com/macros/s/{id}/exec?sheet=Posts&apiKey=CMSxyz"

# Paginated + sorted
curl "https://script.google.com/macros/s/{id}/exec?sheet=Posts&page=1&limit=10&sortBy=title&order=asc"

# Filtered + translated
curl "https://script.google.com/macros/s/{id}/exec?sheet=Products&category=Electronics&lang=en"

# Filter by any column
curl "https://script.google.com/macros/s/{id}/exec?sheet=Orders&status=pending&customer=Acme"
```

### POST — Create

```bash
curl -X POST "https://script.google.com/macros/s/{id}/exec?sheet=Posts&apiKey=CMSxyz" \
  -H "Content-Type: application/json" \
  -d '{"action":"create","data":{"Title":"Hello","Category":"News"}}'
```

### POST — Update

```bash
curl -X POST "https://script.google.com/macros/s/{id}/exec?sheet=Posts&apiKey=CMSxyz" \
  -H "Content-Type: application/json" \
  -d '{"action":"update","data":{"UUID":"abc-123","Title":"Updated"}}'
```

### POST — Delete

```bash
curl -X POST "https://script.google.com/macros/s/{id}/exec?sheet=Posts&apiKey=CMSxyz" \
  -H "Content-Type: application/json" \
  -d '{"action":"delete","data":{"UUID":"abc-123"}}'
```

---

## client-side: google.script.run

```javascript
// Load sheet headers and data
google.script.run
  .withSuccessHandler((data) => console.log(data))
  .withFailureHandler((err) => console.error(err))
  .loadData();

// Submit form data
google.script.run
  .withSuccessHandler(() => alert("Saved!"))
  .withFailureHandler((err) => alert(err))
  .insertTable("Posts", { Title: "Hello", Category: "News" });

// Get headers schema (cached)
google.script.run.withSuccessHandler((schema) => renderForm(schema))._getHeadersSchema();

// Update settings/config
google.script.run
  .withSuccessHandler(() => console.log("Settings updated"))
  ._updateData("SETTINGS_KEY", { autoTranslate: true });

// Invalidate cache
google.script.run.withSuccessHandler(() => console.log("Cache cleared"))._invalidateCache("HEADERS");
```

---

## Response Format

```json
{
  "statusCode": 200,
  "success": true,
  "message": "Data retrieved successfully",
  "data": { ... }
}
```

| Field        | Description                           |
| ------------ | ------------------------------------- |
| `statusCode` | HTTP status (200, 400, 401, 404, 500) |
| `success`    | `true` for 2xx, `false` otherwise     |
| `message`    | Human-readable description            |
| `data`       | Payload (present on success)          |

---

## Response Helpers (Server-Side)

| Use Case                  | Helper                                                     |
| ------------------------- | ---------------------------------------------------------- |
| Success (GET/POST/UPDATE) | `APIService.createResponse().ok("Message", data)`          |
| Invalid request           | `APIService.createResponse().badRequest()`                 |
| Invalid auth              | `APIService.createResponse().unauthorized()`               |
| No permission             | `APIService.createResponse().forbidden()`                  |
| Not found                 | `APIService.createResponse().notFound()`                   |
| Internal error            | `APIService.createResponse().internalError(err.message)`   |
| Custom code               | `APIService.createResponse().custom(201, "Created", data)` |

---

## Common Patterns

```javascript
// Fetch + render in one call
async function loadAndRender() {
  const headers = await new Promise((resolve, reject) => {
    google.script.run.withSuccessHandler(resolve).withFailureHandler(reject)._getHeadersSchema();
  });
  renderForm(headers);
}

// Submit with files
const formData = { Title: "Post", Attachment: [{ name: "img.png", mimeType: "image/png", base64Data: "..." }] };
google.script.run.insertTable("Posts", formData);
```

---

## See Also

- [REST API Reference](./REST_API.MD) — full API documentation
- [Getting Started](./GETTING_STARTED.MD) — step-by-step guide
- [Translation](./TRANSLATION.MD) — `?lang=` parameter details
