/**
 * Event contract — re-exported from `core`.
 *
 * The map lives in `@aio-ui/core/events` instead of here so the shell can type its port
 * against it: `@aio-ui/app` may import `core` types and nothing else, and a contract that
 * only the emitter package exported would force the shell to depend on the emitter.
 *
 * The path stays for compatibility — `@aio-ui/event-emitter/PageEvents` still resolves.
 */
export type { iComponentEvents, iEventCallback, iEventEmit, iPageEvents, iPagePhase } from "@aio-ui/core/events";
