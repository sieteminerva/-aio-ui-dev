/**
 * Event contracts.
 *
 * One channel carries two layers of reporting, because both are "something happened
 * while the page was being built" and a host usually wants them in the same place:
 *
 * - **component events** — a builder reports a node it added, changed or removed. They
 *   exist in `registry.ts` because their payload names builder types, and a builder may
 *   fire them explicitly through `config.emit` (a component is framework-agnostic; its
 *   config is the only channel it has).
 * - **page events** — the application shell reports a render pass: started, preloaded,
 *   attached, failed, superseded, torn down.
 *
 * The page map *extends* the component map, so an emitter registered for pages accepts
 * component events without a cast.
 */
export {};
//# sourceMappingURL=events.js.map