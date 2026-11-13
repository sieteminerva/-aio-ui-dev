# Field Types

One contract for how a spreadsheet column becomes an editable field and, separately,
how a table becomes a rendered block.

Three vocabularies exist in this system and must never be conflated:

| Vocabulary                                      | Example values                                                                            | Answers                    |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------- | -------------------------- |
| Table schema (`TableBuilderService` validation) | `dropdown`, `currency`, `number_between`, `date`, `checkbox`                              | what the cell accepts      |
| Field type (`fields[].type`)                    | the `InputType` union — `text`, `textarea`, `number`, `select`, `dropdown`, `radio`, `file`, `email`, `tel`, `url`, `date`, `time`, `datetime-local`, `range`, `color`, `password`, `hidden`, `actions`, `checkbox` | how a user edits the value |
| Component name                                  | `masonry`, `article`, `hero`, `footer`                                                    | how the data is rendered   |

`fields[].type` is the same union `@aio-ui/input` accepts on a node (`packages/components/input/Input.ts`);
the demo's `#form` route exercises `text`, `email`, `tel`, `number`, `textarea`, `select`, `dropdown`,
`radio`, `checkbox` and `file`.

Field type is derived from the **column definition** (validation + cell note). It is never
derived from CSS classes, tag names, or header spelling.

## Column definition

A column is described by its **cell note in row 1**, which holds the whole field descriptor.
`DataService.getHeaderAttributes()` writes a default note when none exists, so a sheet is
automatically self-describing after the first request.

Notes travel with the cell, so renaming or moving a column does not orphan its schema.
That is why header text is safe to change and why no separate schema store is needed.

### Field descriptor (as returned in `fields[]`)

```ts
{
  title: "ImageUrl",            // header text; the row key is its camelCase form
  type: "file",                 // form vocabulary — authoritative
  placeholder?: string,
  required?: boolean,
  range?: "SegmentRange",       // named range, resolved into config.options
  hasTranslation?: boolean,
  config: {
    sheet: number | string,     // storage detail — never sent to the public payload
    cell: string,               // storage detail — never sent to the public payload
    skipped?: boolean,          // hidden from forms, still present in data
    options?: string[],         // resolved from `range`, or written inline
  },
}
```

Keys are camelCased by the Gviz layer (`Image Address` → `imageAddress`), so `title` is the
only place the original header text survives.

### Note keys

| Key                           | Type       | Status   | Meaning                                               |
| ----------------------------- | ---------- | -------- | ----------------------------------------------------- |
| `title`                       | string     | observed | display label; written by `DataService` on first read |
| `type`                        | field type | observed | authoritative form type; defaults to `text`           |
| `placeholder`                 | string     | observed | input placeholder                                     |
| `required`                    | boolean    | observed | value must be filled                                  |
| `range`                       | string     | observed | named range whose values become `config.options`      |
| `config.skipped`              | boolean    | observed | hidden from forms; the value stays in `data`          |
| `config.options`              | string[]   | observed | resolved option list for `select`                     |
| `config.sheet`, `config.cell` | storage    | observed | address of the column; GAS-only                       |
| `maxlength`                   | number     | observed | maximum character length                              |

`config.skipped` is the current flag. If a `hidden` / `system` distinction is added later it
must live in `config` too, so the descriptor keeps one shape.

## Derivation order

Strict precedence — the first rule that matches wins:

1. `note.type` — authoritative for every sheet that has been read at least once.
2. Sheet validation type (only when a note is missing).
3. Fallback `text`.

Header-name hints (`ImageUrl` → `file`) are **not** part of the contract. They exist nowhere in
the current code and must not be reintroduced.

## Validation mapping

Only used when a note is absent, i.e. before `DataService` has written one.

| Sheet validation                                            | Field type               | Notes                                       |
| ----------------------------------------------------------- | ------------------------ | ------------------------------------------- |
| `dropdown`                                                  | `select`                 | options from `note.options` or `note.range` |
| `number_between`, `number_greater_than`, `number_less_than` | `number`                 | carry `min`/`max` through                   |
| `currency`                                                  | `number`                 | formatting only; value stays numeric        |
| `date`                                                      | `date`                   |                                             |
| `checkbox`                                                  | `checkbox`               |                                             |
| `text_length`                                               | `text`                   | `maxlength` from the rule                   |
| _(none)_                                                    | `note.input` or fallback |                                             |

## System columns

`timestamp`, `uuid`, and any column with `system: true` are:

- hidden from forms and from public page payloads;
- retained in `data` so the frontend can sort, paginate and key records.

`hidden: true` columns stay in the payload (they are valid content) but are not editable.

## What must not happen

- Inferring a field type from a CSS selector (`p.eyebrow` → `text`). The dashboard experiment
  did this; it couples data shape to presentation and silently degrades everything to `text`.
- Inferring a component from a header name. The component is table-level metadata.
- Storing sheet ids or cell addresses in a public payload. They are storage details; keep them
  under a `storage` field that the browser never needs.

## Worked example

Portfolio column `ImageUrl` with note
`{"title":"ImageUrl","type":"file","config":{"sheet":2128641545,"cell":"I1"}}`
becomes the field `{ title: "ImageUrl", type: "file" }` and the record key `imageUrl`.

Column `Years` with note `{"title":"Years","type":"date","required":true,...}` becomes
`{ title: "Years", type: "date", required: true }` and the key `years`.

A column whose note carries `config.skipped: true` stays in `data` but is not rendered in a form.

## Open items

1. Confirm the public shape: `config.sheet` and `config.cell` currently travel inside `fields`.
   They are storage addresses and should be stripped, or moved under a `storage` key.
2. Decide whether `file` values are stored as Drive file names (`<fileId>.ext`, as written by
   `UploadService`), full Drive URLs, or both.
3. Decide whether `number` values keep currency formatting in the cell or stay raw numbers.
4. `fields` is returned per resolved sheet, so a `lang` request returns the localized sheet's
   fields. Confirm that localized copies keep the same `type` per column.
