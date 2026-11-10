/**
 * DOM and node contracts: what a page tree looks like and how nodes are recorded.
 */
import type { iElementProperty } from "./content";
import type { iBuilderRegistry } from "./registry";
export interface iMetadataContext {
    scopeId: string;
    parentKey: string | null;
}
declare global {
    interface HTMLSelectElement {
        __nativeChangeHandler: (e: Event) => any;
    }
    interface HTMLElement {
        __outer: HTMLElement;
        __inner: HTMLElement;
        __payload: any;
        __index: number;
        __templateId: string;
        getMetadata: ((context: iMetadataContext) => any) | undefined | null;
        mount: (compositeOutput: iCompositeBuilderOutput | HTMLElement | null | any) => void;
    }
}
export interface iNodeRecords {
    records: iNodeRecordItem[];
}
export interface iNodeRecordItem<T = any> {
    key: string;
    element: HTMLElement;
    payload: T;
    relations?: iNodeRecordRelations;
}
export interface iNodeRecordRelations {
    scope?: string;
    key?: string;
    template?: string;
    parent?: string | null;
    children?: string[];
    elements?: string[];
}
export interface iCompositeBuilderOutput {
    element: HTMLElement;
    metadata: iNodeRecords;
}
export interface iNodeLifecycleHooks {
    onCreated?: (element: HTMLElement) => void;
    onDestroy?: (element: HTMLElement) => void;
}
export type DefaultSelectors = 'grid' | 'row' | 'column' | string;
export type ValidLayoutKey<S extends string> = S | `${S}${string}`;
export interface iAdvancedStandardNode<S extends string = DefaultSelectors> extends iNodeLifecycleHooks {
    builder?: never;
    attrs?: Record<string, string>;
    content?: string | HTMLElement | iNodeContent<S> | iNodeContent<S>[];
    [childKey: string]: any;
}
export type iAdvancedBuilderNode<S extends string = DefaultSelectors> = {
    [K in keyof iBuilderRegistry]: iNodeLifecycleHooks & {
        builder: K;
        content: iBuilderRegistry[K];
        attrs?: Record<string, string>;
        [childKey: string]: iNodeContent<S> | any;
    };
}[keyof iBuilderRegistry];
export type iLayoutItemNode<S extends string = DefaultSelectors> = iAdvancedStandardNode<S> | iAdvancedBuilderNode<S>;
export type iDOMStructure<S extends string = DefaultSelectors> = {
    [K in ValidLayoutKey<S>]?: iLayoutItemNode<S> | any;
};
export type iNodeContent<S extends string = DefaultSelectors> = iDOMStructure<S>;
export interface iBasicStandardNode extends iNodeLifecycleHooks {
    tagName?: string;
    id?: string;
    className?: string;
    builder?: never;
    isRoot?: boolean;
    content?: string | HTMLElement | iBasicNode | iBasicNode[] | iElementProperty;
    _field?: string;
    [customHtmlAttr: string]: any;
}
export type iBasicBuilderNode = {
    [K in keyof iBuilderRegistry]: iNodeLifecycleHooks & {
        tagName?: string;
        id?: string;
        className?: string;
        builder: K;
        isRoot?: boolean;
        content: iBuilderRegistry[K];
        [customHtmlAttr: string]: any;
    };
}[keyof iBuilderRegistry];
export type iBasicNode = iBasicStandardNode | iBasicBuilderNode;
//# sourceMappingURL=node.d.ts.map