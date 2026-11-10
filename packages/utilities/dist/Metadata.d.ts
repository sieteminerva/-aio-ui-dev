export declare function ensureMetadataIdentity(selector: string, scopeId?: string, childSuffix?: string, templateKey?: string): {
    tree: any;
    key: string;
};
export declare function setMetadata(element: HTMLElement, localRecordsPool: any[], _rootPartKey?: string): void;
/**
 * @internal Generates a stable hash seed from content + config for namespace derivation.
 * Extracted from former buildNamespaceSeed() for internal use by ensureIdentity().
 */
export declare function buildNamespace(content: any, config: any): string;
//# sourceMappingURL=Metadata.d.ts.map