/**
 * Builder configuration contracts.
 */

import type { iActionProperty } from "./content";
import type { iComponentEvents } from "./registry";

export type iBuilderSelectorsConfig<TType extends string = string> = Record<TType, iActionProperty>;

export interface iBuilderConfig<TType extends string = string> {
  themeId?: string;
  namespace?: string | null;
  selectors?: Partial<iBuilderSelectorsConfig<TType>>;
  emit?: (<K extends keyof iComponentEvents<TType>>(
    event: K,
    data: iComponentEvents<TType>[K]
  ) => void) | null;
}

export interface iBuilderElementContext<TType extends string = string, TData = any> {
  type: TType;
  element: HTMLElement;
  data: TData;
}

