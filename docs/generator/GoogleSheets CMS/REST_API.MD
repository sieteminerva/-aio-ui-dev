# REST API Reference

Your spreadsheet is automatically exposed as a REST JSON API via Google Apps Script web app deployment.

---

## Base URL

```
https://script.google.com/macros/s/{deploymentId}/exec
```

Get your `deploymentId` from [Deployment](./DEPLOYMENT.MD).

---

## Authentication

Pass your API key in the URL or request body:

```
?apiKey={your-api-key}
```

If no API key is configured in Settings, authentication is skipped (open access).

---

## Response Format

All responses use a unified JSON structure:

```json
{
  "statusCode": 200,
  "success": true,
  "message": "Data retrieved successfully.",
  "data": { ... }
}
```

| Field        | Type    | Description                           |
| ------------ | ------- | ------------------------------------- |
| `statusCode` | number  | HTTP status (200, 400, 401, 404, 500) |
| `success`    | boolean | `true` for 2xx, `false` otherwise     |
| `message`    | string  | Human-readable description            |
| `data`       | object  | Payload (present on success)          |

---

## GET — Read Data

Powered by Google's GViz engine. Supports pagination, filtering, sorting, and translation.

```
GET /exec?sheet={sheetName}&apiKey={key}
```

### Query Parameters

| Param        | Type   | Default    | Description                                             |
| ------------ | ------ | ---------- | ------------------------------------------------------- |
| `sheet`      | string | _required_ | Name of the sheet to query                              |
| `apiKey`     | string | —          | API key (required if configured)                        |
| `page`       | number | `1`        | Page number                                             |
| `limit`      | number | `10`       | Items per page                                          |
| `sortBy`     | string | —          | Column name to sort by                                  |
| `order`      | string | `asc`      | Sort direction: `asc` or `desc`                         |
| `lang`       | string | —          | Target language for translated data (e.g., `en`, `id`)  |
| `category`   | string | —          | Case-insensitive filter on a `category` column          |
| _any column_ | string | —          | Any sheet column name can be used as a filter parameter |

### Example

```bash
curl "https://script.google.com/macros/s/ABC123/exec?sheet=Posts&page=1&limit=5&sortBy=title&order=asc&apiKey=CMSxyz"
```

### GET Response (Success)

```json
{
  "statusCode": 200,
  "success": true,
  "message": "Data retrieved successfully.",
  "data": [
    {
      "UUID": "123e4567-e89b-12d3",
      "Title": "Welcome to CMS",
      "Category": "News",
      "Timestamp": "01/06/2026 14:30:00"
    }
  ],
  "meta": {
    "totalItems": 42,
    "itemsPerPage": 10,
    "currentPage": 1,
    "totalPages": 5,
    "links": {
      "self": "?sheet=Posts&page=1&limit=10",
      "next": "?sheet=Posts&page=2&limit=10",
      "prev": null,
      "first": "?sheet=Posts&page=1&limit=10",
      "last": "?sheet=Posts&page=5&limit=10"
    }
  }
}
```

---

## POST — Create / Update / Delete

All mutations use the `POST` method with a JSON body. The `action` field determines the operation.

```
POST /exec?sheet={sheetName}&apiKey={key}
Content-Type: application/json
```

### Standard Body Format

```json
{
  "action": "create|update|delete",
  "apiKey": "your-api-key",
  "data": { ... }
}
```

> The `apiKey` and `sheet` can be in the URL **or** the body. URL takes precedence.

---

### Create Record

```bash
curl -X POST "https://script.google.com/macros/s/ABC123/exec?sheet=Posts&apiKey=CMSxyz" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "create",
    "data": {
      "Title": "New Blog Post",
      "Category": "Updates",
      "Content": "Hello world!"
    }
  }'
```

**Response (201):**

```json
{
  "statusCode": 201,
  "success": true,
  "message": "Record created successfully.",
  "data": { "UUID": "generated-uuid-here" }
}
```

> The system auto-generates `UUID`, `Timestamp`, and `Email Address` for every new record.

---

### Update Record

Requires the record's `UUID` to identify the row:

```bash
curl -X POST "https://script.google.com/macros/s/ABC123/exec?sheet=Posts&apiKey=CMSxyz" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "update",
    "data": {
      "UUID": "123e4567-e89b-12d3",
      "Title": "Updated Blog Title"
    }
  }'
```

**Response (200):**

```json
{
  "statusCode": 200,
  "success": true,
  "message": "Record updated successfully."
}
```

> Only include fields you want to change. Missing fields are left unchanged. The `UUID` field is **required** for updates.

---

### Delete Record

```bash
curl -X POST "https://script.google.com/macros/s/ABC123/exec?sheet=Posts&apiKey=CMSxyz" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "delete",
    "data": {
      "UUID": "123e4567-e89b-12d3"
    }
  }'
```

**Response (200):**

```json
{
  "statusCode": 200,
  "success": true,
  "message": "Record deleted successfully."
}
```

---

## Error Responses

| Status | When                                                                           |
| ------ | ------------------------------------------------------------------------------ |
| `400`  | Missing `sheet` parameter, invalid JSON body, missing `UUID` for update/delete |
| `401`  | Invalid or missing API key                                                     |
| `404`  | Sheet not found, record UUID not found                                         |
| `500`  | Internal server error                                                          |

```json
{
  "statusCode": 404,
  "success": false,
  "message": "Sheet 'Unknown' not found."
}
```

---

## Data Integrity

- All write operations are protected by `LockService` (thread-safe atomic locks)
- Race conditions between concurrent users are prevented
- Only one mutation can execute at a time per spreadsheet

---

## Legacy Formats (Backward Compatible)

The system still supports pre-`action` field formats:

```json
// Create (no action field)
{ "data": { "Title": "Post", "Category": "News" } }

// Update (old format)
{ "action": "update", "updates": { "uuid": "...", "Title": "New" } }

// Delete (old format)
{ "action": "delete", "uuid": "..." }
```

> Use the standard `data` wrapper for new integrations.

---

## Next

- [API Cheat Sheet](./CHEATSHEET.MD) — quick curl snippets
- [Translation](./TRANSLATION.MD) — query translated data with `?lang=en`
- [File Upload](./FILE_UPLOAD.MD) — upload files via API
