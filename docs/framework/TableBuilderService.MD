# TableBuilderService

Lightweight schema-driven Google Sheets table framework for Apps Script.

Built to simplify:

- programmatic table creation
- named ranges
- validation rules
- formulas
- footer generation
- schema synchronization
- table reconciliation

without manually writing repetitive Google Sheets boilerplate.

---

# Why This Exists

Originally this project started from repetitive code like this:

```js
createConfigSheet();
createNamedRange();
applyValidation();
setColumnWidth();
buildFooter();
```

which quickly became:

- difficult to maintain
- repetitive
- tightly coupled
- hard to evolve safely

`TableBuilderService` abstracts those concerns into a declarative schema-based system.

---

# Features

## ✅ Table Rendering

- headers
- body rows
- footer rows

---

## ✅ Column Configuration

- width
- formatting
- validation
- formulas

---

## ✅ Validation System

Supports:

- dropdown
- currency
- number range
- date
- checkbox

---

## ✅ Named Ranges

Create dynamic named ranges linked to semantic headers instead of raw column letters.

---

## ✅ Formula Engine

Supports semantic formulas:

```js
=SUM({{Salary}})
```

instead of hardcoded:

```js
=SUM(C2:C100)
```

---

## ✅ Footer Builder

Supports:

- totals
- averages
- counts
- labels
- formulas
- custom styles
- colspan merging

---

## ✅ Lifecycle Hooks

```js
table.on("afterCreate", callback);
```

---

## ✅ Native Google Tables

Optional conversion into modern Google Sheets native tables.

---

## ✅ Sync / Diff Engine

Supports schema reconciliation without destroying user data.

---

## ✅ Developer Metadata

Uses Google Sheets Developer Metadata internally for:

- footer tracking
- sync state
- schema persistence

---

# Architecture

| Class                     | Responsibility          |
| ------------------------- | ----------------------- |
| `TableBuilderService`     | Main orchestration      |
| `TableBuilderServiceUtil` | Helpers & utilities     |
| `TableBuilderDiff`        | Schema diff/sync engine |

---

# Installation

Requires:

- Google Apps Script
- V8 Runtime
- (Optional) Sheets Advanced API enabled

---

# Basic Example

```js
function createEmployeesTable() {
  const table = new TableBuilderService({
    sheetName: "Employees",

    headers: ["UUID", "Name", "Department", "Salary", "Tax", "Final Salary"],

    body: [
      ["EMP-001", "John", "Engineering", 7000000],
      ["EMP-002", "Jane", "Finance", 8500000],
    ],

    footer: [
      {
        type: "label",
        text: "Grand Total",
        header: "Department",
        style: {
          colspan: 2,
          align: "center",
        },
      },
      {
        type: "sum",
        header: "Salary",
        validation: {
          type: "currency",
          currency: "IDR",
        },
      },
    ],

    options: {
      nativeTable: true,

      tableName: "EmployeesTable",

      mandatoryProps: true,

      columns: [
        {
          header: "UUID",
          width: 220,
        },

        {
          header: "Name",
          width: 180,
        },

        {
          header: "Salary",
          width: 180,

          validation: {
            type: "currency",
            currency: "IDR",
            min: 0,
          },
        },

        {
          header: "Tax",

          formula: {
            expression: "={{Salary}}*10%",
          },
        },

        {
          header: "Final Salary",

          formula: {
            expression: "={{Salary}}-{{Tax}}",
          },
        },
      ],

      namedRanges: [
        {
          name: "EmployeeSalary",
          header: "Salary",
        },
        {
          name: "EmployeeUUID",
          header: "UUID",
        },
      ],
    },
  });

  table.create();
}
```

---

# Real Use Case — Config Sheet Builder

The original repetitive implementation:

```js
createConfigSheet();
```

can now become:

```js
function createConfigSheet() {
  const table = new TableBuilderService({
    sheetName: "vars",

    headers: ["Exclude Sheets", "Exclude Headers", "Priority Level"],

    body: [
      ["vars", "UUID", 1],
      ["Sheet1", "timestamp", 5],
    ],

    options: {
      nativeTable: true,

      tableName: "VarsConfig",

      columns: [
        {
          header: "Exclude Sheets",

          width: 250,

          validation: {
            type: "dropdown",
            options: ["vars", "Sheet1"],
          },
        },

        {
          header: "Exclude Headers",

          width: 250,

          validation: {
            type: "dropdown",
            options: ["UUID", "timestamp", "Email Address", "Email"],
          },
        },

        {
          header: "Priority Level",

          width: 150,

          validation: {
            type: "number_between",
            min: 1,
            max: 5,
          },
        },
      ],

      namedRanges: [
        {
          name: "ExcludeSheets",
          header: "Exclude Sheets",
        },
        {
          name: "ExcludeHeaders",
          header: "Exclude Headers",
        },
      ],
    },
  });

  table.create();
}
```

---

# Constructor

```js
new TableBuilderService(config);
```

---

# Constructor Schema

## Main Config

| Property    | Type                        | Description          |
| ----------- | --------------------------- | -------------------- |
| `sheetName` | `string`                    | Target sheet         |
| `headers`   | `Array<string>`             | Table headers        |
| `body`      | `Array<Array<any>>`         | Table rows           |
| `footer`    | `Array<TableBuilderFooter>` | Footer configuration |
| `options`   | `TableBuilderOptions`       | Table options        |

---

# Column Configuration

```js
columns: [
  {
    header: "Salary",
    width: 180,

    validation: {
      type: "currency",
      currency: "IDR",
    },

    formula: {
      expression: "={{Salary}}*10%",
    },
  },
];
```

---

# Validation Types

## Dropdown

```js
validation: {
  type: "dropdown",
  options: ["A", "B", "C"]
}
```

---

## Number Range

```js
validation: {
  type: "number_between",
  min: 1,
  max: 10
}
```

---

## Currency

```js
validation: {
  type: "currency",
  currency: "IDR",
  min: 0
}
```

Supported:

- IDR
- USD
- EUR
- GBP
- JPY

---

## Date

```js
validation: {
  type: "date";
}
```

---

## Checkbox

```js
validation: {
  type: "checkbox";
}
```

---

# Formulas

## Semantic Formula

```js
formula: {
  expression: "={{Salary}}*10%";
}
```

Automatically resolves:

- semantic column references
- row numbers
- dynamic ranges

---

# Footer Configuration

```js
footer: [
  {
    type: "label",
    text: "Grand Total",
    header: "Department",

    style: {
      colspan: 2,
      align: "center",
    },
  },

  {
    type: "sum",
    header: "Salary",
  },
];
```

---

# Footer Types

| Type      | Description     |
| --------- | --------------- |
| `label`   | Static text     |
| `sum`     | SUM formula     |
| `average` | AVERAGE formula |
| `count`   | COUNT formula   |
| `formula` | Custom formula  |
| `value`   | Static value    |

---

# Named Ranges

```js
namedRanges: [
  {
    name: "EmployeeSalary",
    header: "Salary",
  },
];
```

Creates:

```txt
Salary2:Salary
```

Open-ended dynamic ranges.

---

# Lifecycle Hooks

```js
table.on("afterCreate", ({ sheet }) => {
  Logger.log(sheet.getName());
});
```

---

# Available Hooks

| Hook                | Description           |
| ------------------- | --------------------- |
| `beforeCreate`      | Before table creation |
| `beforeRender`      | Before rendering      |
| `afterRender`       | After rendering       |
| `afterStyle`        | After styling         |
| `afterColumnConfig` | After column configs  |
| `afterNamedRanges`  | After named ranges    |
| `afterFooter`       | After footer          |
| `afterCreate`       | After everything      |

---

# Sync / Diff Engine

```js
table.sync();
```

Updates:

- schema
- columns
- formulas
- footer
- named ranges

without destroying existing sheet data.

---

# Semantic Column Resolution

Internally all systems use:

- header identity
  instead of:
- raw indexes

Meaning:

- safe column reordering
- safe insertions
- safer syncs

---

# Developer Metadata

Internally stores:

- footer rows
- sync state
- schema info

using Google Sheets Developer Metadata.

---

# Philosophy

This project intentionally focuses on:

- declarative schemas
- semantic references
- reconciliation over rebuilds
- maintainability
- extensibility

instead of:

- manual imperative spreadsheet scripting

---

# Current Status

Current implementation supports:

- table rendering
- validation
- formulas
- named ranges
- footer engine
- lifecycle hooks
- metadata
- diff synchronization

Planned future improvements:

- schema migrations
- formula dependency graph
- plugin system
- advanced diff reconciliation
- schema snapshots
- row-level syncing
