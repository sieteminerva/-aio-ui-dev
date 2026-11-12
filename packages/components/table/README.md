# Table (`@aio-ui/table`)

Table renders a header, a body and a footer from one data object, and owns the behaviour a static
table does not: pagination, sorting, selection, inline editing, per-cell options and row formulas.

Cells may be plain values or objects (`{ value, className, href, … }`), and the helper exports
(`__normalizeCell`, `__applyCellOptions`, `__applyFormula`, `numberToText`) are the same functions the
builder uses, so a host can reuse them.

## Payload

```ts
{
  header: ["Name", "Qty", "Price"],
  body: [
    ["Coffee", 2, 45000],
    ["Tea", { value: 1, className: "muted" }, 20000],
  ],
  footer: null,
}
```

`header` is an array of column titles, `body` an array of row arrays (same order as `header`), and
`footer` either `null` or a footer definition. A missing key is treated as an empty array.

## Config

| Option         | Default | Meaning                                                   |
| -------------- | ------- | --------------------------------------------------------- |
| `size`, `type`, `color` | `null` | Presentation modifiers applied as table classes  |
| `textAlign`    | `null`  | Default cell alignment                                    |
| `sortable`     | `false` | Click a header to sort                                    |
| `selectable`   | `false` | Row selection                                             |
| `editable`     | `true`  | Row actions (edit/remove) and inline editing              |
| `renderAsCard` | `false` | Card presentation for narrow layouts                      |
| `autoNumbering`| `true`  | Prefix a running number column                            |
| `pageSize`     | `8`     | Rows per page                                             |
| `disableSubRow`| `false` | Disable expanded sub-rows                                 |
| `autoFreezeAt` | `null`  | Freeze the first N columns                                |
| `headerOptions`, `bodyOptions`, `footerOptions` | `{}` / `[]` / `{}` | Per-section options        |
| `className`    | `""`    | Extra classes on the table element                        |
| `selectors`    | see defaults | Per-key tag/class override                           |

## Nodes

| Key                              | Default tag | Class / note                     |
| -------------------------------- | ----------- | -------------------------------- |
| `@container`                     | `div`       | `table-container`                |
| `@table`                         | `table`     | `table`                          |
| `@table>thead` / `>tbody` / `>tfoot` | `thead` / `tbody` / `tfoot` | — |
| `@table>trow`                    | `tr`        | —                                |
| `@table>trow>th` / `>cell`       | `th` / `td` | —                                |
| `@table>trow>total`              | `div`       | `cell grand`                     |
| `@table>tbody>actions`           | `div`       | `actions-set`, wrapped in `td.actions` |
| `@table>tbody>actions>edit`      | `button`    | `edit-btn`                       |
| `@table>tbody>actions>remove`    | `button`    | `remove-btn`                     |
| `@table>tbody>actions>add`       | `button`    | `add-btn`                        |
| `@table>tfoot>pagination`        | `div`       | `pagination menu`                |
| `@table>tfoot>pagination>item`   | `a`         | `item`                           |
| `@table>tfoot>pagination>prev` / `>next` | `a`  | `item prev` / `item next`        |
| `@table>tfoot>add-row`           | `button`    | `add-row-btn`                    |
| `@table>icon`                    | `i`         | `icon`                           |

## Tokens

`--table-*` (12 tokens) are declared on `table.table` and on `*:has(> table.table)` — not on
`:root` — because a table needs container-query context on its parent. The sheet also reads four app
status tokens: `--app-status-error`, `--app-status-error-fill`, `--app-status-info`,
`--app-status-info-fill`. Override any `--table-*` on an ancestor of the table.

## Wiring checklist

1. Add `"table"` to `iBuilderRegistry` in `packages/core/src/types/registry.ts`.
2. Add a loader for `@aio-ui/table` to the host's asset map.
3. Add a `stylesheet` loader for `@aio-ui/table/Table.css`.
4. List it in the host's route plan: `registerModule(components, [{ route, components: ["table"] }])`.
