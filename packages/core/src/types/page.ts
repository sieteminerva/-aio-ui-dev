/**
 * Page-level contracts: page sources, theme modules and page reports.
 */

import type { iBasicNode } from "./node";
import type { iBuilderRegistry } from "./registry";

export interface iLandingPageBuilderSource {
  menu?: HTMLElement | iBasicNode | null;
  footer?: HTMLElement | iBasicNode | null;
  pages: Record<string, iBasicNode[]>;
}


export interface iThemeModule {
  readonly themeId: string;
  readonly name: string;

  /**
   * 🧙‍♂️ HOOK 1: STRUCTURAL MUTATION (Pre-Render Lifecycle)
   * Veto right to reconstruct the raw template objects BEFORE DOM synthesis.
   */
  beforePageRender?(
    pageBlocks: iBasicNode[],
    menuBlock: iBasicNode | null,
    footerBlock: iBasicNode | null,
    context?: Record<string, Function>
  ): {
    pages: iBasicNode[];
    menu: iBasicNode | null;
    footer: iBasicNode | null;
  };

  /**
   * ⚡ HOOK 2: BEHAVIORAL INTERACTION (Post-Render Lifecycle)
   * Triggered when the final elements tree is fully live on the DOM.
   */
  activate(shell: HTMLElement, elements: HTMLElement[], context: { setConfig: (builderName: keyof iBuilderRegistry, newConfig: Record<string, any>) => void; }): void;

  /**
   * 🛑 HOOK 3: MEMORY CLEANUP (Unmount Lifecycle)
   * MUST be used to unbind custom event listeners to eliminate memory leaks.
   */
  deactivate?(shell: HTMLElement): void;

  templates?(): Record<string, (typeKey: any, el: HTMLElement, payload: any, selector: any) => void>;
}


export type themeSwitcherPosition = "top-left" | "top-right" | "bottom-right" | "bottom-left";


