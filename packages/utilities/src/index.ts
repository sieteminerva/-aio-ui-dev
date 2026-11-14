/** Public surface of `@aio-ui/utilities` — curated, never `export *`. */

export { applyAttrDictionary, applyAttributeList } from "./AttributeUtils";
export type { iAttributeSpec } from "./AttributeUtils";
export { generateRandomColor, hexToRgb, hexToRgba } from "./color.utils";
export { createImageError } from "./DomUtils";
export { mergeInputConfig, numberToText, toBeString, truncateText } from "./helper";
export { buildNamespace, ensureMetadataIdentity, setMetadata } from "./Metadata";
export { EMPTY_TABLE, detectDelimiter, parseTableRecords, parseTableText, splitCsvRows } from "./parseTableFile";
export type { iParsedTableFile } from "./parseTableFile";
export { selectorToTree } from "./SelectorToTree";
