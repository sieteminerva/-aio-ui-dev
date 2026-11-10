/**
 * Table file parsing — CSV/JSON → `{ header, body, footer }`.
 *
 * Pure text in, plain object out. It used to live inside `FileUploader` as a static that
 * took a *form id*, which meant the input layer had to know about tables and the table
 * layer had to ask the input layer for data it already had (the `File`). Now the owner of
 * the file hands it over, and the transformation has one home.
 *
 * No DOM beyond `FileReader`, so it can be tested with plain strings.
 */
/** Table data shape the `TableBuilder` accepts. */
export interface iParsedTableFile {
    header: Array<string | number>;
    body: Array<Array<string | number>>;
    footer: null;
}
/** Empty result — used when there is no file, or the file is empty. */
export declare const EMPTY_TABLE: iParsedTableFile;
/**
 * Detects the delimiter from the header line.
 *
 * Counted **outside quotes only**, and only on the first record: a text cell is free to
 * contain semicolons, and quoted headers may contain newlines.
 *
 * @param headerLine - First record, before parsing.
 * @returns `";"` when it wins, `","` otherwise.
 */
export declare function detectDelimiter(headerLine: string): "," | ";";
/**
 * Splits CSV text into records.
 *
 * A state machine, because a cell may contain the delimiter, a quote, or a newline: a
 * naive `split(",")` breaks on the first quoted address. `""` inside a quoted cell is a
 * literal quote, and CRLF counts as one record break.
 *
 * @param text - Whole file contents.
 * @param separator - Delimiter chosen by {@link detectDelimiter}.
 * @returns Rows of raw cell strings; blank rows are dropped.
 */
export declare function splitCsvRows(text: string, separator: string): string[][];
/**
 * Parses CSV text into table data.
 *
 * @param text - Whole file contents.
 * @returns Header from the first record, body from the rest, `footer` left null for the
 *   table layer to decide.
 */
export declare function parseTableText(text: string): iParsedTableFile;
/**
 * Parses an array of records into table data, keeping the key order of the first record.
 *
 * @param records - Parsed JSON records.
 * @returns Header from the first record's keys, body from its values.
 */
export declare function parseTableRecords(records: unknown): iParsedTableFile;
/**
 * Reads a `.csv`/`.json` file and parses it into table data.
 *
 * The extension decides the parser; anything else resolves to an empty table instead of
 * throwing, because "the user picked the wrong file" is a normal state, not an error.
 *
 * @param file - File selected by the user.
 * @returns Table data.
 */
export declare function parseTableFile(file: File): Promise<iParsedTableFile>;
//# sourceMappingURL=parseTableFile.d.ts.map