# AnimationsService (`@aio-ui/animations`)

The `animation` slot — a lifecycle and execution engine for **declarative** DOM animations.
Nothing is animated imperatively: an element carries an `animation` attribute, and this service
finds it, plays it, and stops it.

## Payload

None — the markup carries the intent:

```html
<p animation="fade-in">…</p>
```

Built-in behaviours (the `animation` attribute value):

| Type                  | Effect                                     |
| --------------------- | ------------------------------------------ |
| `fade-in`             | fade in, optional duration                 |
| `stagger-fade`        | fade a group in sequence                   |
| `typewriter`          | type text, optional loop / rewrite         |
| `text-scramble`       | scramble into the final text               |
| `count-up`            | count a number up to its value             |
| `loading-placeholder` | placeholder while data is missing          |

## Config

| Option               | Default | Meaning                                        |
| -------------------- | ------- | ---------------------------------------------- |
| `delay`              | `500`   | Global delay (ms) before a behaviour starts     |
| `typewriter`         | —       | `{ loop, interval, delay, rewrite }`            |
| `fade`               | —       | `{ duration }`                                  |
| `staggerFade`        | —       | `{ delay, duration }`                           |
| `scramble`           | —       | `{ chars, speed }`                              |
| `loadingPlaceholder` | —       | `{ duration }`                                  |
| `behaviours`         | `[]`    | Extra behaviours registered at construction     |

## Nodes

None — it decorates nodes other components built. Behaviour hooks are CSS classes plus
`Animations.css`, which the package ships.

## Tokens

None of its own; timings live in the config above, not in CSS custom properties.

## Methods

| Method                    | Meaning                                                     |
| ------------------------- | ----------------------------------------------------------- |
| `init(root)`              | Observe a subtree and play what is already there            |
| `scan(root)`              | Force a scan; returns the animated nodes                    |
| `mount(node)` / `unmount(node)` | Track or release one node programmatically           |
| `observe(node)` / `unobserve(node)` | Viewport entry/exit for one node                  |
| `trigger(node)`           | Play now, regardless of viewport                            |
| `next(scope)`             | Advance a chained scope (`fieldset`, `form`, `section`)      |
| `stop(node)` / `reset(target)` / `clear(target)` | Interrupt, rewind, or drop state       |
| `use(behaviour)`          | Register one behaviour after construction                   |
| `destroy()`               | Release observers and every record                          |

## Wiring checklist

1. `.registerModule(AnimationsService)` — the app calls `init()` after each render pass.
2. Ship `@aio-ui/animations/Animations.css` from the host.
3. Mark elements in the markup: `animation="fade-in"`, `animated-once="true"` to never replay.
4. A new behaviour is registered with `use()`; duplicate types throw on purpose.
