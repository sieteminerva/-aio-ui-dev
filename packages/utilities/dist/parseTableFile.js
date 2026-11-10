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
/** Empty result — used when there is no file, or the file is empty. */
export const EMPTY_TABLE = { header: [], body: [], footer: null };
/**
 * Detects the delimiter from the header line.
 *
 * Counted **outside quotes only**, and only on the first record: a text cell is free to
 * contain semicolons, and quoted headers may contain newlines.
 *
 * @param headerLine - First record, before parsing.
 * @returns `";"` when it wins, `","` otherwise.
 */
export function detectDelimiter(headerLine) {
    const countOutsideQuotes = (text, target) => {
        let quoted = false;
        let count = 0;
        for (const char of text) {
            if (char === '"')
                quoted = !quoted;
            else if (!quoted && char === target)
                count++;
        }
        return count;
    };
    return countOutsideQuotes(headerLine, ";") > countOutsideQuotes(headerLine, ",") ? ";" : ",";
}
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
export function splitCsvRows(text, separator) {
    const rows = [];
    let row = [];
    let cell = "";
    let quoted = false;
    let index = 0;
    const pushCell = () => { row.push(cell); cell = ""; };
    const pushRow = () => {
        pushCell();
        if (row.some((value) => value.trim() !== ""))
            rows.push(row);
        row = [];
    };
    while (index < text.length) {
        const char = text[index];
        if (quoted) {
            if (char === '"') {
                if (text[index + 1] === '"') {
                    cell += '"';
                    index += 2;
                    continue;
                }
                quoted = false;
                index++;
                continue;
            }
            cell += char;
            index++;
            continue;
        }
        if (char === '"') {
            quoted = true;
            index++;
            continue;
        }
        if (char === separator) {
            pushCell();
            index++;
            continue;
        }
        if (char === "\n" || char === "\r") {
            if (char === "\r" && text[index + 1] === "\n")
                index++;
            pushRow();
            index++;
            continue;
        }
        cell += char;
        index++;
    }
    if (cell !== "" || row.length > 0) {
        pushCell();
        if (row.some((value) => value.trim() !== ""))
            rows.push(row);
    }
    return rows;
}
/** Trims a cell and casts a plain numeric value to a number. */
function castCell(cell) {
    const value = cell.trim();
    return value !== "" && !Number.isNaN(Number(value)) ? Number(value) : value;
}
/**
 * Parses CSV text into table data.
 *
 * @param text - Whole file contents.
 * @returns Header from the first record, body from the rest, `footer` left null for the
 *   table layer to decide.
 */
export function parseTableText(text) {
    if (!text || text.trim() === "")
        return { ...EMPTY_TABLE };
    const headerLine = (() => {
        let quoted = false;
        for (let index = 0; index < text.length; index++) {
            const char = text[index];
            if (char === '"')
                quoted = !quoted;
            if (!quoted && (char === "\n" || char === "\r"))
                return text.slice(0, index);
        }
        return text;
    })();
    const rows = splitCsvRows(text, detectDelimiter(headerLine));
    const [header = [], ...body] = rows;
    return {
        header: header.map(castCell),
        body: body.map((row) => row.map(castCell)),
        footer: null,
    };
}
/**
 * Parses an array of records into table data, keeping the key order of the first record.
 *
 * @param records - Parsed JSON records.
 * @returns Header from the first record's keys, body from its values.
 */
export function parseTableRecords(records) {
    if (!Array.isArray(records) || records.length === 0)
        return { ...EMPTY_TABLE };
    const first = records[0];
    if (typeof first !== "object" || first === null)
        return { ...EMPTY_TABLE };
    return {
        header: Object.keys(first),
        body: records.map((record) => Object.values(record)),
        footer: null,
    };
}
/**
 * Reads a `.csv`/`.json` file and parses it into table data.
 *
 * The extension decides the parser; anything else resolves to an empty table instead of
 * throwing, because "the user picked the wrong file" is a normal state, not an error.
 *
 * @param file - File selected by the user.
 * @returns Table data.
 */
export async function parseTableFile(file) {
    const extension = file.name.split(".").pop()?.toLowerCase();
    if (extension !== "csv" && extension !== "json")
        return { ...EMPTY_TABLE };
    const text = await file.text();
    if (extension === "json") {
        try {
            return parseTableRecords(JSON.parse(text));
        }
        catch {
            return { ...EMPTY_TABLE };
        }
    }
    return parseTableText(text);
}
//# sourceMappingURL=parseTableFile.js.map