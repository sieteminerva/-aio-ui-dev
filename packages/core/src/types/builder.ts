/**
 * Builder configuration contracts.
 */

import type { iElementProperty } from "./content";
import type { iEventEmit } from "./events";

export type iBuilderSelectorsConfig<TType extends string = string> = Record<TType, iElementProperty>;

export interface iBuilderConfig<TType extends string = string> {
  themeId?: string;
  namespace?: string | null;
  selectors?: Partial<iBuilderSelectorsConfig<TType>>;
  /**
   * Event publisher.
   *
   * The registry fills this in automatically for every build once the host attaches an
   * emitter (`registry.useEmitter(...)`), so a component does not need to know whether
   * the application has one. A component used outside the shell can still be handed its
   * own publisher through `config`, or silence it with `emit: null`.
   */
  emit?: iEventEmit | null;
}

export interface iBuilderElementContext<TType extends string = string, TData = any> {
  type: TType;
  element: HTMLElement;
  data: TData;
}

