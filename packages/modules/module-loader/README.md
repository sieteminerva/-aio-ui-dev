# ModuleLoader (`@aio-ui/module-loader`)

Loads, tracks and destroys **optional** modules on top of a definition store. Two classes, two
concerns: `ModuleRegistry` owns which definitions exist, `ModuleLoader` owns their lifecycle
(load order, rebuild-safe reload, reverse-order teardown).

> **This package fills no app slot.** `AioApp` never registers it and it declares no
> `static readonly slot`; an app, a form or a page instantiates it directly when it has optional
> parts to manage.

## Payload

A definition is data, not behaviour:

```ts
{
  id: "validation",
  requires: [],
  matches: (context) => true,     // optional: does it apply here?
  load: (context) => instance,    // returns the live object the caller keeps
  destroy: (instance) => void,    // optional teardown of that same object
}
```

## Config

| Option      | Default  | Meaning                                  |
| ----------- | -------- | ---------------------------------------- |
| `duplicate` | `"warn"` | Policy for two definitions sharing an id |

Constructed as `new ModuleLoader(scope, definitions?, options?)`.

## Nodes

None.

## Tokens

None.

## Methods

| Method                                        | Meaning                                                    |
| --------------------------------------------- | ---------------------------------------------------------- |
| `load(id, context)`                           | Load one module after its `requires`; returns the instance |
| `resolveAll(context)`                         | Load every applicable definition in dependency order       |
| `loaded(id)` / `isLoaded(id)` / `loadedIds()` | Inspect what is live                                       |
| `ids()` / `has(id)` / `resolve(id)`           | Inspect the definitions                                    |
| `unload(id)` / `unloadAll()`                  | Teardown in reverse load order                             |
| `registry` (getter)                           | The backing `ModuleRegistry`                               |

## Wiring checklist

1. `const loader = new ModuleLoader("form", definitions);` inside the consumer, not in the app.
2. Call `loader.resolveAll(context)` when the consumer starts; `unloadAll()` when it stops.
3. Keep `requires` honest: a missing dependency is reported, never silently skipped.
4. `ModuleRegistry` alone is the right choice when you only want storage/inspection.
