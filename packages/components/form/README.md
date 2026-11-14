# Form (`@aio-ui/form`)

Form renders a schema of groups and fields into a real `form`, and owns the parts a plain form does
not: multi-step gating, cascading (conditional) fields, live calculation, validation messages, and
the submit payload.

Fields themselves are components. The form builds the layout and calls the field adapters, so a
field's look still belongs to `@aio-ui/input`; the form only positions it.

## Payload

```ts
[
  {
    id: "group-1",
    title: "Data pengiriman",
    description: "…",
    group: [{ type: "text", id: "name", title: "Nama" }],
  },
];
```

An array of groups, each with an optional `group` array of field nodes (or nested rows). The shape of
a field node is the input package's contract, not this one.

### Group and row keys

| Key               | On         | Meaning                                                                     |
| ----------------- | ---------- | --------------------------------------------------------------------------- |
| `id`              | group, row | Identity; cascade paths and the submit payload use it                       |
| `legend`          | group      | Text of the `<legend>` (`title` is the fallback)                            |
| `title`           | group, row | Heading; on a group it doubles as the legend when `legend` is absent        |
| `description`     | group      | Paragraph under the legend                                                  |
| `group`           | group      | Fieldset children                                                           |
| `row`             | row        | Inline children — layout, not a fieldset                                    |
| `label`           | row        | Title rendered above the row (`@form>row>title`)                            |
| `column`          | group, row | Column count for the layout                                                 |
| `actions`         | group, row | Action words rendered in the corner: `search`, `copy`, `editor`, `repeater` |
| `actionsPosition` | group, row | Where those buttons sit (`config.position` is the older spelling)           |

A field's own keys (`type`, `id`, `title`, `placeholder`, `editable`, `condition`,
`config.wide`, `config.csv`, …) belong to `@aio-ui/input`; `config.wide` (`50` = half,
`"auto"` = full row) is only read by the form when it lays a row out.

## Config

| Option                              | Default          | Meaning                                                                   |
| ----------------------------------- | ---------------- | ------------------------------------------------------------------------- |
| `id`, `name`                        | `""`             | Form identity; the id is derived from `id` (`form-<slug>`)                |
| `title`                             | `""`             | Heading above the first group                                             |
| `description`                       | `""`             | Paragraph under the heading                                               |
| `method`, `action`                  | `"post"`, `""`   | Native form attributes                                                    |
| `className`                         | `""`             | Extra classes, de-duplicated                                              |
| `submitButton`                      | `true`           | Render the submit button                                                  |
| `buttonText`                        | `"Submit"`       | Submit label                                                              |
| `buttonClass`                       | `""`             | Extra classes on the submit button                                        |
| `resetOnSubmit` / `resetOnComplete` | `false` / `true` | Clear before sending / after success                                      |
| `multistep`                         | `false`          | Split groups into steps with gating                                       |
| `cascading`                         | `false`          | Honour each field's `condition`                                           |
| `cascadeMode`                       | `"template"`     | `template` plants a `<template>`; `hidden` builds then hides              |
| `onCascade`                         | `null`           | Called with every cascade mount / unmount / gate                          |
| `calculation`                       | `false`          | Enable formula fields                                                     |
| `messages`                          | built-in         | Every sentence the form says back (validation, gate, submit)              |
| `files`                             | `"ignore"`       | `"ignore"` keeps files out of the payload; a function opts in             |
| `excludeEmpty`                      | `false`          | Drop `""`, `false` and empty arrays from the submit payload               |
| `onSubmit`                          | `null`           | Called with the assembled payload                                         |
| `footer`                            | `null`           | Element or string appended after the actions                              |
| `minHeight`                         | `"400px"`        | Reserved height for lazily loaded groups                                  |
| `createEventListener`               | `true`           | Bind the form's own submit/reset listeners                                |
| `autoDisableNextStep`               | `false`          | Disable `next` until the current step validates                           |
| `address`                           | `null`           | `{ loader, url, service, geocode, useAdapter }` for `[data-level]` fields |
| `modules`                           | `null`           | Optional `ModuleLoader` replacing any built-in feature handler            |

`address.loader` wins over `url`/`service`; `useAdapter` picks the picker markup (`"aio"` for
this framework, `"native"` for platform controls, default `"native"`).

`cascadeMode: "hidden"` exists because a chained field (an address picker feeding the next select)
needs a live element to inject into; a `<template>` gives it nothing.

## Supported syntax

Four behaviour engines, one flag each. A flag only opens the door: the engine itself is a module,
and when it is absent the form degrades to a no-op instead of throwing. The form never imports an
engine or a sibling package — `FORM_ADAPTER_MANIFEST` is the default stack, and the host composes
the rest.

### Registering the form

```ts
import { FORM_ADAPTER_MANIFEST } from "@aio-ui/form/FormRegistry";

// 1. The adapter stack: the form's own engines, then whatever the host adds.
const modules = [
  ...FORM_ADAPTER_MANIFEST,
  { id: "idAddress", path: "@aio-ui/id-address/form", export: "idAddressFormAdapter" },
  { id: "table", path: "@aio-ui/table/adapters/FormAdapter", export: "tableFormAdapter" },
  { id: "message", path: "@aio-ui/message/adapters/FormAdapter", export: "messageFormAdapter" },
];

// 2. The registry entry. `export` is required: the package publishes more than one builder.
components.register("form", () => ({
  path: "@aio-ui/form",
  stylesheet: "@aio-ui/form/Form.css",
  modules,
  export: "FormBuilder",
  schema,
  config,
}));

// 3. The route plan. A builder called inside `onCreated` is invisible to the node collector,
//    so a cold load fails before it is fetched unless the route names it.
registerModule(components, [{ route: "checkout", components: ["form", "input", "menu"] }]);

// 4. Use it. `config` is optional; every key in the table above has a default.
const element = build("form", { schema, config: { id: "checkout" } });
element.addEventListener("formSubmit", (event) => console.log(event.detail.data));
```

### Validation

The rules are the fields' own DOM attributes (`required`, `pattern`, `min`, `max`, `minlength`,
`maxlength`, `type`). Nothing is declared in `config`: the engine reads the constraints at submit
or at `next`, so a message never appears while the user is still typing.

```ts
const schema = [
  {
    id: "order",
    title: "Order details",
    group: [
      { type: "text", id: "name", title: "Name", required: true },
      { type: "text", id: "invoice", title: "Invoice", required: true, pattern: "INV-[0-9]+" },
      { type: "number", id: "qty", title: "Quantity", min: 1, max: 10 },
    ],
  },
];

const element = build("form", { schema, config: { id: "order-form" } });

element.addEventListener("formValidation", (event) => {
  const { reason, message } = event.detail; // reason: "valid" | "native" | …
  if (reason !== "valid") console.warn(reason, message);
});
```

### Cascade

`condition` on a field is the whole declaration: while the condition is false the field is not in
the DOM. `cascadeMode` decides whether it is built and hidden (`"hidden"`) or planted as a
`<template>` (`"template"`, the default). Use `"hidden"` when another engine needs a live element
to inject into — a chained address picker, for example.

```ts
const schema = [
  {
    id: "delivery",
    group: [
      { type: "radio", id: "pickup", name: "delivery", value: "pickup", title: "Pickup" },
      { type: "radio", id: "courier", name: "delivery", value: "courier", title: "Courier" },
      {
        type: "text",
        id: "courierNote",
        title: "Note for the courier",
        condition: { field: "delivery", equals: "courier" },
      },
    ],
  },
];

build("form", {
  schema,
  config: {
    cascading: true,
    cascadeMode: "hidden",
    onCascade: (state) => console.log("cascade", state),
  },
});
```

### Calculation

`calculation: true` turns the engine on; a field opts in with `config.calculator`. The engine walks
the schema, runs each formula against the current values and writes the total into `outputId`.

```ts
const schema = [
  {
    id: "line",
    group: [
      {
        type: "number",
        id: "qty",
        title: "Qty",
        min: 0,
        // The formula travels with the field that carries the quantity.
        config: {
          calculator: {
            id: "line-total",
            outputId: "total",
            formula: ({ getNumber }) => ({
              id: "line-total",
              label: "Line",
              quantity: getNumber("qty"),
              unitPrice: getNumber("price"),
              total: getNumber("qty") * getNumber("price"),
            }),
          },
        },
      },
      { type: "number", id: "price", title: "Price", min: 0 },
      { type: "number", id: "total", title: "Total", readonly: true },
    ],
  },
];

build("form", { schema, config: { calculation: true } });
```

### Multistep

`multistep: true` turns each group into a step. `prepare()` plants a `<template data-step>` in place
of every step and the fieldset is built when that step is opened, so a heavy step costs nothing
until it is reached. Validation is scanned per step: a step that has not been opened cannot block
the one the user is on.

```ts
const schema = [
  { id: "contact", title: "Step 1 · Contact", group: [{ type: "email", id: "email", title: "Email", required: true }] },
  { id: "address", title: "Step 2 · Address", group: [{ type: "text", id: "city", title: "City", required: true }] },
  { id: "confirm", title: "Step 3 · Confirm", group: [{ type: "checkbox", id: "agree", title: "I agree" }] },
];

build("form", {
  schema,
  config: {
    id: "signup",
    multistep: true,
    // Optional: keep `next` disabled until the current step validates.
    autoDisableNextStep: true,
  },
});
```

## Nodes

| Key                          | Default tag | Class                      |
| ---------------------------- | ----------- | -------------------------- |
| `@container`                 | `div`       | `form-widget-wrapper`      |
| `@form`                      | `form`      | `native form`              |
| `@form>group`                | `fieldset`  | `form-group`               |
| `@form>group>legend`         | `legend`    | `title`                    |
| `@form>group>desc`           | `p`         | `desc`                     |
| `@form>title`                | `h2`        | `title`                    |
| `@form>desc`                 | `p`         | `desc`                     |
| `@form>row`                  | `div`       | `field group`              |
| `@form>row>title`            | `p`         | `title`                    |
| `@form>actions`              | `div`       | `form-actions`             |
| `@form>actions>submit`       | `button`    | `submit` (`type="submit"`) |
| `@form>actions>submit-group` | `button`    | `submit` (`type="button"`) |
| `@form>footer`               | `div`       | `form-footer`              |
| `@form>buttons-set`          | `div`       | `buttons set`              |

## Tokens

`Form.css` deliberately consumes `--input-*` (`--input-border-radius`, `--input-label-size`) instead
of declaring a `--form-*` layer: a form has no look of its own, its fields do. If the form is used
without the input module mounted, those tokens need a host-level fallback.

## Wiring checklist

1. Add `"form"` to `iBuilderRegistry` in `packages/core/src/types/registry.ts`.
2. Add a loader for `@aio-ui/form` to the host's asset map **and** the input module it delegates to.
3. Add a `stylesheet` loader for `@aio-ui/form/Form.css`.
4. List it in the host's route plan: `registerModule(components, [{ route, components: ["form", "input"] }])`.
