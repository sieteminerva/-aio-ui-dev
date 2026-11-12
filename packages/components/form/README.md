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

## Config

| Option                              | Default          | Meaning                                                       |
| ----------------------------------- | ---------------- | ------------------------------------------------------------- |
| `id`, `name`                        | `""`             | Form identity; the id is derived from `id` (`form-<slug>`)    |
| `title`                             | `""`             | Heading above the first group                                 |
| `description`                       | `""`             | Paragraph under the heading                                   |
| `method`, `action`                  | `"post"`, `""`   | Native form attributes                                        |
| `className`                         | `""`             | Extra classes, de-duplicated                                  |
| `submitButton`                      | `true`           | Render the submit button                                      |
| `buttonText`                        | `"Submit"`       | Submit label                                                  |
| `resetOnSubmit` / `resetOnComplete` | `true` / `false` | Clear before sending / after success                          |
| `multistep`                         | `false`          | Split groups into steps with gating                           |
| `cascading`                         | `false`          | Honour each field's `condition`                               |
| `cascadeMode`                       | `"template"`     | `template` plants a `<template>`; `hidden` builds then hides  |
| `calculation`                       | `false`          | Enable formula fields                                         |
| `messages`                          | built-in         | Every sentence the form says back (validation, gate, submit)  |
| `files`                             | `"ignore"`       | `"ignore"` keeps files out of the payload; a function opts in |
| `excludeEmpty`                      | `false`          | Drop `""`, `false` and empty arrays from the submit payload   |
| `onSubmit`                          | `null`           | Called with the assembled payload                             |
| `footer`                            | `null`           | Element or string appended after the actions                  |
| `minHeight`                         | `""`             | Reserved height for lazily loaded groups                      |

`cascadeMode: "hidden"` exists because a chained field (an address picker feeding the next select)
needs a live element to inject into; a `<template>` gives it nothing.

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
