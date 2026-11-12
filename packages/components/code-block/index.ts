/** Public surface of `@aio-ui/code-block` — curated, never `export *`.
 *
 * Only the builder is a value here: the registry resolves a component module by its exports,
 * and two exported functions would make every load a guess (it warns and takes the first).
 */

export { CodeBlockBuilder } from "./CodeBlock";
export type { CodeBlockElementType, iCodeBlockConfig, iCodeBlockEntry } from "./CodeBlock";
