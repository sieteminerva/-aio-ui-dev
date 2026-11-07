/**
 * API contracts for the Google Apps Script CMS.
 *
 * Derived from the deployed response of `GET /exec?sheetName=…`:
 * `{ success, message, data, meta }`, with `fields` intended but currently absent
 * (see `docs/API.md`). Records are already normalised server-side: keys are
 * lower-camel and dates are ISO strings.
 */

/** Field types the CMS can emit in `fields[].type`. */
export type iFieldType =
  | "text"
  | "textarea"
  | "number"
  | "select"
  | "date"
  | "checkbox"
  | "file"
  | "url";

/** One record. Keys are the camel-cased header names of the source sheet. */
export type iRecord = Record<string, unknown>;

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
 * `fields` is declared optional on purpose: the deployed build omits it while
 * `GvizService.paginate()` indexes its header array by sheet name, which yields
 * `undefined`. Consumers must tolerate its absence rather than assume a schema.
 */
export interface iApiResponse<T extends iRecord = iRecord> {
  success: boolean;
  message: string;
  data: T[];
  fields?: iFieldDescriptor[];
  meta: iApiMeta;
}
