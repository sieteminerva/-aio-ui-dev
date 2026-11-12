# EventEmitter (`@aio-ui/event-emitter`)

The `events` slot — one synchronous bus for two layers: component events (`elementAdded`,
`elementChanged`, `elementRemoved`) and page events (`pageChanged`, `beforeRender`, `ready`,
`superseded`, `themeChanged`, `error`, `destroyed`).

## Payload

None. The app registers the instance; the shell wires it into the registry once
(`registry.useEmitter(emitter.emit)`), and every builder receives `config.emit` from there.

## Config

None — construct it and register the instance:

```ts
.registerModule(new EventEmitter())
```

## Nodes

None.

## Tokens

None.

## Methods

| Method            | Meaning                                                          |
| ----------------- | ---------------------------------------------------------------- |
| `on(event, cb)`   | Subscribe; known events are typed, custom names are accepted      |
| `emit(event, data)` | Publish; **a throwing listener cannot stop the others** (logged) |
| `off(event, cb)`  | Unsubscribe                                                       |
| `clear()`         | Drop every listener                                               |
| `destroy()`       | Same as `clear()`; present so a host can release modules generically |

Unknown event names are deliberate: a component may name its own (`formValidation`,
`tabs:content-loaded`, `modeChanged`).

## Wiring checklist

1. `const emitter = new EventEmitter();` then `.registerModule(emitter)`.
2. Expose it in development (`globalThis.__emitter`) if you want to poke events by hand.
3. Do not use it as control flow: a bus reports, it does not decide.
4. `emit` is passed around as a bare function — never hand out the instance to a component.
