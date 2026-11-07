import type { iComponentEvents } from "@aio-ui/core/registry";

/**
 * Events published by the application shell around page rendering.
 *
 * Lives with the emitter because it is the emitter's payload contract; it extends
 * the builder-level events declared in `core`, so the dependency points at `core`.
 */
export interface iPageEvents<T extends string = string> extends iComponentEvents<T> {
  beforeRender: {
    route: string;
    pages: any[]; // Sesuaikan dengan iBasicNode[] asli Anda di lokal
    menu: any | null;
    footer: any | null;
    pageMetaReport?: any;
  };
  pageChanged: { route: string; activeNodes?: HTMLElement[] };
}
