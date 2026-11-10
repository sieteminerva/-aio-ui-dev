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
import type { iComponentEvents } from "./registry";
/** Re-exported so a consumer needs one specifier (`@aio-ui/core/events`) for both layers. */
export type { iComponentEvents };
/** Which stage of a render pass failed. */
export type iPagePhase = "prepare" | "preload" | "render" | "ready";
/**
 * Everything the shell publishes around a render pass.
 *
 * Every entry names the route, so a listener attached once for the whole session never
 * has to guess which page the event belongs to — the failure mode of the old contract,
 * where `beforeRender` and `ready` carried no route at all.
 */
export interface iPageEvents<T extends string = string> extends iComponentEvents<T> {
    /** A pass begins. `previous` is the route being left, `null` on the first render. */
    pageChanged: {
        route: string;
        previous: string | null;
    };
    /** Component names derived, before anything is preloaded. */
    beforeRender: {
        route: string;
        components: string[];
        missing: string[];
        sequence: number;
    };
    /** Page attached, theme activated, `onReady` done. `elements` is `id → element`. */
    ready: {
        route: string;
        shell: HTMLElement;
        elements: Map<string, HTMLElement>;
        sequence: number;
    };
    /** A newer navigation won; this pass will not paint. */
    superseded: {
        route: string;
        sequence: number;
        by: number;
    };
    /** The router reported a different theme. */
    themeChanged: {
        theme: string;
        previous: string | null;
        shell: HTMLElement | null;
    };
    /** A step failed. The previous DOM stays mounted on purpose. */
    error: {
        message: string;
        route: string;
        phase: iPagePhase;
        error: unknown;
    };
    /** `destroy()` released the modules and removed the shell. */
    destroyed: {
        route: string;
    };
}
/**
 * Publisher shape shared by builders and the shell.
 *
 * Known keys carry their payload type; an unknown key is accepted and untyped, because
 * a component may name its own events (`formValidation`, `tabs:content-loaded`) without
 * being forced to cast or to be registered in the map first.
 *
 * @example
 * emit("elementChanged", { builder: "product", element, data });
 * emit("formValidation", detail); // custom name, untyped by design
 */
export type iEventEmit = <K extends string>(event: K, data?: K extends keyof iPageEvents ? iPageEvents[K] : any) => void;
/** Listener shape matching {@link iEventEmit}. */
export type iEventCallback<K extends string> = (data: K extends keyof iPageEvents ? iPageEvents[K] : any) => void;
//# sourceMappingURL=events.d.ts.map