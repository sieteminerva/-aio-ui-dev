# Modal (`@aio-ui/modal`)

Modal renders a hidden overlay (`.dialog.hidden`) holding a header and a body, and hands the caller
the handles to open it. `build()` returns the element, so the controls arrive through
`config.onReady` — that is the intended way to open a modal.

Closing is either a full teardown (`destroyOnClose: true`, the default) or a hide, and both a close
button and a backdrop click are wired through stored references, so `destroy()` removes exactly the
listeners it added.

## Payload

An `HTMLElement`, an HTML string, or a node-shaped object — whatever `_compileContent` accepts. A
string payload is parsed into an element; the component never sets `el.innerHTML` on user text.

```ts
build("modal", document.createElement("form"));
```

`config.title` is independent of the payload: it becomes the `h2.title` inside the header.

## Config

| Option           | Default            | Meaning                                                  |
| ---------------- | ------------------ | -------------------------------------------------------- |
| `id`             | `"modal-default"`  | DOM id; a second prepare with the same id removes the old overlay |
| `title`          | `"Notification"`   | Header text                                              |
| `className`      | `""`               | Extra classes on the outer overlay                       |
| `modalClass`     | `""`               | Extra classes on the inner box                           |
| `destroyOnClose` | `true`             | Remove on close instead of hiding                        |
| `onOpen`         | no-op              | Called with the overlay when opened                      |
| `onClose`        | no-op              | Called with the overlay when closed                      |
| `onReady`        | no-op              | Receives `iModalControls` once the overlay exists        |
| `selectors`      | see defaults       | Per-key tag/class override                               |

`iModalControls` = `{ element, open, close, unmount }`. After `destroy()`, `open()` and `close()`
refuse to pretend the modal still works.

## Nodes

| Key                | Default tag | Class / note                        |
| ------------------ | ----------- | ----------------------------------- |
| `@container`       | `div`       | `dialog hidden` — the overlay        |
| `@modal`           | `div`       | `modal` — the box                    |
| `@modal>header`    | `div`       | `header` (contains `h2.title`)       |
| `@modal>closeBtn`  | none        | `close`; the declared tag is empty, so the wrapper decides |

The body is appended by the builder, not by a declared key: the compiled payload element gets the
`body` class.

## Tokens

No `--modal-*` layer. `Modal.css` reads `--padding-layout`, a name **no package declares** — an app
must bridge it or the box loses its padding. Recorded as a known gap (the same class of issue as
`Dropdown.css` reading `--app-surface-muted` outside the layer block).

## Wiring checklist

1. Add `"modal"` to `iBuilderRegistry` in `packages/core/src/types/registry.ts`.
2. Add a loader for `@aio-ui/modal` to the host's asset map.
3. Add a `stylesheet` loader for `@aio-ui/modal/Modal.css`.
4. Open it from `onReady`: `const el = build("modal", content); controls.open()`. A modal renders
   nothing visible until opened, so a display page needs its own trigger.
