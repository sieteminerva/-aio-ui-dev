/**
 * API contracts for the Google Apps Script CMS.
 *
 * Derived from the deployed response of `GET /exec?sheetName=…`:
 * `{ success, message, data, meta }`, with `fields` intended but currently absent
 * (see `docs/API.md`). Records are already normalised server-side: keys are
 * lower-camel and dates are ISO strings.
 */
/** Field types the CMS can emit in `fields[].type`. */
export type iFieldType = "text" | "textarea" | "number" | "select" | "date" | "checkbox" | "file" | "url";
/** One record. Keys are the camel-cased header names of the source sheet. */
export type iRecord = Record<string, unknown>;
/**
 * Header text to record key, as implemented by the server.
 *
 * Tokens are split on non-alphanumerics; the first token is lowercased and each
 * following token is capitalised. A single PascalCase token is lowercased whole,
 * so `ImageUrl` becomes `imageurl` while `Email Address` becomes `emailAddress`.
 * Consumers must reuse this rule verbatim; it is not reversible from `title`.
 */
export type iRecordKey = string;
/**
 * Column descriptor. Mirrors the JSON stored in the header cell note and returned
 * by `DataService.getHeaderAttributes()`.
 */
export interface iFieldDescriptor {
    /** Header text as written in the sheet; the record key is its camelCase form. */
    title: string;
    type: iFieldType;
    placeholder?: string;
    required?: boolean;
    /** Named range resolved into `config.options`. */
    range?: string;
    hasTranslation?: boolean;
    config?: {
        /** Hidden from forms, still present in `data`. */
        skipped?: boolean;
        options?: string[];
        /** Storage address of the column. GAS-only; strip before shipping to a browser. */
        sheet?: number | string;
        /** Storage address of the column. GAS-only; strip before shipping to a browser. */
        cell?: string;
    };
}
/** HATEOAS pagination links. Relative to the deployment URL. */
export interface iApiLinks {
    self: string;
    first: string;
    last: string;
    next: string | null;
    prev: string | null;
}
export interface iApiMeta {
    totalItems: number;
    itemsPerPage: number;
    currentPage: number;
    totalPages: number;
    links: iApiLinks;
}
/**
 * Envelope returned by `GET`.
 *
 * Confirmed against a live deployment: `fields` carries one descriptor per column,
 * in sheet order. Records are NOT one-to-one with fields: empty cells are omitted,
 * and skipped columns still appear in `data`.
 */
export interface iApiResponse<T extends iRecord = iRecord> {
    success: boolean;
    message: string;
    data: T[];
    fields: iFieldDescriptor[];
    meta: iApiMeta;
}
//# sourceMappingURL=api.d.ts.map