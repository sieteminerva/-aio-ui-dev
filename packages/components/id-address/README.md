# IdAddressBuilder (`@aio-ui/id-address`) — plugin

A **plugin**, not a builder. It renders no fields: it decorates the `[data-level]` controls a page or
`@aio-ui/form` already rendered, and owns the cascade (propinsi → kota → kecamatan → kelurahan →
kodepos), the reverse postal-code lookup and the optional geocode lookup. Adapters decide which
parts of the markup are authoritative; in `headless` mode there is no markup at all and the host
drives `schema.select()` itself.

## Payload

The engine takes no `content` payload. Its input is the query it sends to a data source:

| Query                                            | Meaning                   |
| ------------------------------------------------ | ------------------------- |
| `{ level: "propinsi" }`                          | top-level rows            |
| `{ level: "kota", parentId: <propinsi_id> }`     | children of a selection   |
| `{ level: "kodepos", parentId: <kelurahan_id> }` | postal codes of a village |

A source resolves to rows shaped `{ <level>_id, <level>_name }`, for example
`{ propinsi_id: 12, propinsi_name: "Jawa Barat" }`. Levels, in order: `propinsi` → `kota` →
`kecamatan` → `kelurahan` → `kodepos`.

### Schema node

Each level is represented once, as `IdAddressSchemaRef`:

| Property      | Meaning                                 |
| ------------- | --------------------------------------- |
| `name`        | level key (`propinsi`, `kota`, …)       |
| `adapterName` | adapter that drives this level          |
| `adapter`     | the adapter instance                    |
| `el`          | DOM element, or `null` in headless mode |
| `next`        | the next schema node                    |
| `index`       | position in the chain                   |
| `isDropdown`  | whether the level is selectable         |
| `getDetail()` | accumulated address detail so far       |

## Config

| Option        | Default                                                                               | Meaning                                                                         |
| ------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `url`         | `null`                                                                                | Endpoint of the built-in fetch path; ignored when `loader` is set               |
| `loader`      | `null`                                                                                | `(query) => Promise<rows>`; the seam for your transport, cache or mock          |
| `service`     | `null`                                                                                | `HttpService` that owns transport + cache; built from `url` + `cache` otherwise |
| `geocode`     | `false`                                                                               | Enable geocode lookup and `onGeocodeLoaded`                                     |
| `cache`       | `{ enabled: true, ttlDays: 1, prefix: "IdAddressBuilder", delay: 0, timeout: 10000 }` | Forwarded to the service the builder creates                                    |
| `container`   | `null`                                                                                | Element (or selector) holding the `[data-level]` markup                         |
| `useAdapter`  | `null` → `native`                                                                     | `native`, `aio`, `base`, or a name passed to `registerAdapter`                  |
| `headless`    | `false`                                                                               | No DOM; selects the `base` adapter                                              |
| `textContent` | `loading` / `placeholder` / `notFound` copy, with `#{level}` substituted              | Labels written into the decorated controls                                      |

### Adapters

| `useAdapter`         | Drives                                                                                                                           | Notes                                                                        |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `native` _(default)_ | A plain `<select>`, or an `<input>` fed by a `<datalist>`                                                                        | The platform's own controls, written to directly.                            |
| `aio`                | `@aio-ui` markup: `option.placeholder`, `.dropdown[data-style="datalist" \| "select"]`, the hidden value carrier, `.field` state | Dispatches `change`/`input`, so the component's own listeners see the answer |
| `base`               | Nothing                                                                                                                          | Selected automatically when `headless: true`                                 |

The markup is identical between the two UI adapters — the difference is _which parts of it are
authoritative_. `native` treats `data-style="select"` dropdowns as opaque; `aio` renders both
flavours. A host may register its own adapter (`registerAdapter(name, adapter)`); an adapter
implements `init`, `setOptions`, `setSelectedOption`, `onLevelChange`, `clear` and `destroy`.

```ts
const picker = new IdAddressBuilder({
  container: "#address-form",
  loader: (query) => http.get(query), // or `url`
  useAdapter: "aio",
});
```

### Events

Three callbacks, all shaped `(schema, data, complete) => void`:

| Callback          | Fires when                                           |
| ----------------- | ---------------------------------------------------- |
| `onLevelLoaded`   | a level finished loading                             |
| `onLevelChanged`  | a selection changed and the cascade re-ran           |
| `onGeocodeLoaded` | geocode data for the current detail became available |

## Nodes

The plugin never creates a field; it decorates the markup it is given. The contract is one control
per level inside `config.container`:

| Node                                | Note                                                                   |
| ----------------------------------- | ---------------------------------------------------------------------- |
| `container`                         | Any element holding the level controls (the form, a `<section>`, …)    |
| `[data-level="propinsi"]`           | one per level: `propinsi`, `kota`, `kecamatan`, `kelurahan`, `kodepos` |
| `<select>` / `<input>`+`<datalist>` | the `native` carrier                                                   |
| `.dropdown[data-level][data-style]` | the `aio` carrier; `data-style` is `datalist` or `select`              |
| `.field`                            | the wrapper whose `loading` / `error` state is toggled                 |

`[data-level]` is **not** unique to the value carrier: a custom dropdown may mark the wrapper too,
so the builder filters the elements it decorates instead of taking every match.

`@aio-ui/core/Stylesheets` fetches `id-address.css` on `init()`, so a host only declares where the
sheet can be found (its `styles` asset map) — nothing is injected twice.

## Tokens

Declared once on `:root, [data-theme]` in `id-address.css`. The package contributes only its own
contribution to the field (`loading` / `error` states); the base look stays with whoever renders the
field.

| Token                      | Derives from         | Used for                                          |
| -------------------------- | -------------------- | ------------------------------------------------- |
| `--id-address-error-color` | `--app-status-error` | Border, outline and dropdown hairline in `.error` |

## Methods

| Method                                                 | Meaning                                                                |
| ------------------------------------------------------ | ---------------------------------------------------------------------- |
| `init()`                                               | Bind the adapters, load the first level, request the stylesheet        |
| `destroy()`                                            | Remove listeners, adapters and internal state                          |
| `registerAdapter(name, adapter)`                       | Add an adapter before `init()`                                         |
| `loadNextLevel(level, parentId, selected?)`            | Load one level's options manually                                      |
| `clearNextLevel(level, refresh?)`                      | Clear the levels below `level`                                         |
| `getRegionalData(query)`                               | Run one query through the active source                                |
| `getDetailByKodepos(kodepos, location?)`               | Reverse lookup: rebuild the address from a postal code                 |
| `getGeocodeLocation(detail)`                           | Resolve coordinates for a detail record                                |
| `detail` (getter)                                      | The accumulated `{ propinsi, kota, … }` record                         |
| `config` (getter/setter)                               | Read the resolved config; the setter merges and re-derives what it can |
| `onLevelLoaded` / `onLevelChanged` / `onGeocodeLoaded` | Register a lifecycle callback (see Config → Events)                    |

### `schema.load(parentId, selectedValue?)`

Loads one level's options by hand — the escape hatch when the host owns the interaction.

```js
builder.onLevelLoaded(async (schema, data) => {
  // manually continue the cascade
  await schema.next.load(data[0][`${schema.name}_id`]);
});
```

### `schema.select(selectedItem)`

Programmatically performs a selection. It updates the detail state, clears the child levels, loads
the next level, emits the lifecycle callbacks and optionally resolves geocode data.

```js
await schema.select(data.find((row) => row.kota_id === value));
```

## Wiring checklist

1. `npm install @aio-ui/id-address @aio-ui/http-service` — the plugin needs neither `@aio-ui/form`
   nor `@aio-ui/input`.
2. Render one control per level, each marked `data-level="<level>"`, inside the container you pass
   as `config.container`.
3. Pick one data source: `url` (built-in fetch), `service` (shared `HttpService`) or `loader`
   (no transport — what tests and mock rows use).
4. Call `init()` after the markup exists and `destroy()` when the page goes away.

| Entry                                                                | What it gives you                                                           |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `@aio-ui/id-address`                                                 | `IdAddressBuilder` and the config/detail types                              |
| `@aio-ui/id-address/adapter`                                         | the adapter interface and the bundled adapters                              |
| `@aio-ui/id-address/adapter.native`, `/adapter.aio`, `/adapter.base` | one adapter each                                                            |
| `@aio-ui/id-address/form`                                            | `idAddressFormAdapter`; needs `@aio-ui/form`, which is an **optional peer** |
| `@aio-ui/id-address/id-address.css`                                  | state styling (`loading`, `error`) for the controls it decorates            |

### Quick start

```js
import { IdAddressBuilder } from "@aio-ui/id-address";

const builder = new IdAddressBuilder({
  url: "https://script.google.com/macros/s/<DEPLOYMENT_ID>/exec",
  container: document.getElementById("address-form"),
  useAdapter: "native",
});

builder.init();
```

Headless (the host renders everything, the engine only manages state):

```js
const builder = new IdAddressBuilder({ loader: fetchRows, headless: true });

builder.init();

builder.onLevelLoaded(async (schema, data) => {
  renderLevel(schema.name, data);
  if (schema.next && data.length) await schema.next.load(data[0][`${schema.name}_id`]);
});
```

## Appendix

### Why this exists

Free-typed addresses turn a database into unstructured data: spelling drifts, abbreviations differ,
postal codes go missing and nothing can be validated or aggregated. A cascade over the official
hierarchy fixes the shape of the data at the moment it is captured.

### Architecture

The engine separates four concerns — hierarchical state, asynchronous cascading, rendering and user
interaction — which is what lets it run in two modes:

```txt
Adapter mode                          Headless mode
User Interaction → Adapter            Framework UI  → schema.select()
      → IdAddressBuilder Engine        → Cascade Engine
      → REST API / Cache               → onLevelLoaded() → Framework re-render
```

`Why adapters`: rendering logic is isolated from cascade state, so the same engine serves vanilla
JS, Angular, React, Vue and any custom renderer, and the core never depends on a UI library.

### Cache system

The builder owns no transport or cache any more. One of three sources answers a query:

```js
// 1. url — a private HttpService is built from these options
new IdAddressBuilder({ url: "https://…/exec", cache: { enabled: true, ttlDays: 1 } });
// 2. a shared service — cache, timeout and abort handling stay the app's
new IdAddressBuilder({ service: myHttpService });
// 3. a plain loader — no transport at all
new IdAddressBuilder({ loader: (query) => Promise.resolve(rows) });
```

`cache` is forwarded to the service the builder creates (`ttlDays`, `prefix`, `delay`, `timeout`);
an injected service keeps its own policy. The cache key is the query's **values**, not its shape.

### Framework integration

```jsx
// React
useEffect(() => {
  const builder = new IdAddressBuilder({ url, container: ref.current, useAdapter: "native" });
  builder.init();
  return () => builder.destroy();
}, []);
```

```ts
// Angular, headless
this.builder = new IdAddressBuilder({ url: this.apiUrl, headless: true });
this.builder.init();
this.builder.onLevelLoaded((schema, data) => (this.options[schema.name] = data));
```

```vue
<!-- Vue -->
onMounted(() => { builder = new IdAddressBuilder({ url, container: el, useAdapter: "native" }); builder.init(); });
onBeforeUnmount(() => builder?.destroy());
```

### Server-side REST API

The reference backend is a Google Apps Script web app reading a Google Sheet. Duplicate the
spreadsheet template, set `SPREADSHEET_ID`, deploy as a web app and use the deployment URL.

| Level       | Request                                             |
| ----------- | --------------------------------------------------- |
| `propinsi`  | `GET /exec?level=propinsi`                          |
| `kota`      | `GET /exec?level=kota&parentId=<propinsi_id>`       |
| `kecamatan` | `GET /exec?level=kecamatan&parentId=<kota_id>`      |
| `kelurahan` | `GET /exec?level=kelurahan&parentId=<kecamatan_id>` |
| `kodepos`   | `GET /exec?level=kodepos&parentId=<kelurahan_id>`   |

The API can be used on its own (mobile apps, backends, other frontends); it is not tied to this
package. The builder sends exactly `{ level, parentId }`, which is why `loader` is the only seam a
custom backend has to implement.
