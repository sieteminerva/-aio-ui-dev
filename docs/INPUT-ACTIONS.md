# Control sets (`add` · `delete` · `edit` · `save` · `copy` · `search`)

A **control set** is a row of buttons attached to a **scope**. Two scopes exist:

| Scope     | Declared as                                   | Owned by                                  |
| --------- | --------------------------------------------- | ----------------------------------------- |
| One field | `{ type, id, config: { actions: [...] } }`    | `InputBuilder` (module `controls`)        |
| A group   | `{ id, title, actions: [...], group: [...] }` | `FormBuilder` → `Fieldset` → same module  |
| A row     | `{ id, title, actions: [...], row: [...] }`   | `FormBuilder` → row `<div>` → same module |

`<form>` is deliberately **not** a scope: a set that can clone or delete its host is a
footgun.

```
field:  <div class="field actions">  <input> <div class="controls" position="right">…</div>
group:  <fieldset class="form-group"> <legend/> <field/>… <div class="controls">…</div>
```

Layout: a field's buttons are glued to the input (shared border radii); a group's buttons
sit in the header corner (`fieldset.form-group > .controls`, absolutely positioned) so the
fields keep their full width.

## Actions

Actions may be an array (names and objects mixed) or `{ [type]: definition }`. A bare name
is a **preset**: built-in behaviour, label from the type, no callback needed. An object is
taken literally and exists for a project that wants its own label or work.

```ts
config: {
  actions: ["editor", "repeater", { type: "copy", label: "Copy", onClick }];
}
```

| Preset     | Expands to   |
| ---------- | ------------ |
| `editor`   | edit + save  |
| `repeater` | add + delete |

| Action              | What it does on a scope                                                                                                |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `edit`              | Unlocks every control in the scope and enables `save`.                                                                 |
| `save`              | Locks the scope again, then dispatches `change` on each control so engines re-evaluate.                                |
| `copy`              | Writes the scope's values to the clipboard: the value of a one-control scope, otherwise the collected payload as JSON. |
| `add`               | Clones the whole scope with fresh ids/names (`rec-1` → `rec-1-1`), empty values, and its own working buttons.          |
| `delete` / `remove` | Removes the scope. Never the form.                                                                                     |
| `search`            | Reads the scope (see below).                                                                                           |
| `custom`            | Nothing but `onClick`.                                                                                                 |

Buttons are rendered with `type="button"`, so a set inside a form can never submit it.

A custom dropdown is locked as a **unit**: the visible box, the hidden input that submits,
and `data-locked` on the `div.dropdown` (a readOnly box would still open its popover).
Duplicating a locked scope resets the clone to the pre-lock baseline, so Edit works on the
copy; `editable: true` fields stay writable in the clone as well.

### `context`

```ts
{
  parentElement,            // the scope (field wrapper or <fieldset>)
  input,                    // field payload, or null for a group
  action, button, event,
  element,                  // first control, kept for single-field sets
  value,                    // one control's value, or "a=1&b=2" for a group
  values,                   // every value of the scope, in submit vocabulary
  result,                   // what the action produced (query for `search`)
}
```

## The edit policy

| Declared actions | State of the scope                                                                                                                             |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| contains `edit`  | starts **locked**: `<select>` and non-text inputs are `disabled`, text-like inputs are `readOnly`, scope gets `data-locked="true"` + `.locked` |
| no `edit`        | stays **open**; a scope this set locked earlier is restored, because nothing could unlock it                                                   |

"Locked by the set" is answered by the set's own bookkeeping (`data-locked` plus a
per-control snapshot), never by inspecting `readOnly`/`disabled`: those properties reflect
to attributes, so an author's intent and an earlier lock look identical in the DOM.

When both `edit` and `save` are declared they behave as a pair — exactly one of them is
enabled at a time instead of a second button being appended.

### `editable: true` outranks the lock

```ts
{ type: "text", id: "customer-name", title: "Nama pelanggan", editable: true }
```

A field marked `editable` stays writable even when the scope is locked — a record viewer
with `edit`/`save` can still expose one field that is always live (a comment box, a
quantity). `InputBuilder` writes the marker as `data-editable="true"` on the field wrapper,
and the set skips any control whose ancestor carries it, so it also works per field inside
a locked group. `config.editable` is accepted as well as the node-level key.

## `search`

`search` is a **read**, not a submit:

1. collects the scope's values with `collectFormValues` — the same vocabulary a submit
   uses (multi-select → array, lone checkbox → boolean, shared-name checkboxes → array);
2. dispatches a bubbling `CustomEvent("search")` on the scope with `{ query, scope }`;
3. leaves the query in `context.result` for `onClick`;
4. marks the scope `.searching` + `aria-busy` while `onClick`'s promise is pending.

```ts
{
  id: "lookup",
  title: "Cari pesanan",
  actions: [
    { type: "search", label: "Cari", onClick: async (scope, ctx) => { await api.query(ctx.result); } },
  ],
  group: [{ type: "text", id: "invoice", title: "No. invoice" }],
}
```

Enter inside a text control of a searching scope runs the search (not in a `textarea`,
where Enter is a newline).

## Capability, not obligation

The buttons belong to the input module `controls`. A host that drops it from the preset
(`LITE_INPUT_MODULES`) gets no buttons at all — fields and groups render normally, and
`config.actions` simply does nothing:

```ts
mountControls(fieldset, actions, "right"); // null when the preset has no controls module
```
