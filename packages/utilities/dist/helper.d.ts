export declare function mergeInputConfig(data: any, item: any, watchAttr?: string[]): any;
/**
 * Convert Number to text 1-16 only refers to semantic-ui el wide
 * @param {number} number
 * @returns {string}
 */
export declare function numberToText(number: number): string | undefined;
interface ToBeStringOptions {
    ignoreDuplicate?: boolean;
    separator?: string;
    prefix?: string;
    suffix?: string;
}
type ToBeStringCondition = boolean | Record<string, boolean> | string;
/**
 * Utility for building class-like strings with conditional chaining.
 */
declare class ToBeString {
    parts: string[];
    settings: ToBeStringOptions;
    /**
     * @param base - Initial base value.
     */
    constructor(base?: string);
    /**
     * Update configuration.
     * @param {ToBeStringOptions} options
     * @returns {this}
     */
    config(options?: ToBeStringOptions): ToBeString;
    /**
     * Conditionally add class(es).
     * @param condition - If boolean, decides whether to add. If object, adds keys with truthy values.
     * @param className - String or array of strings to add.
     * @returns {this}
     */
    add(condition: ToBeStringCondition, className?: string | string[]): ToBeString;
    /**
     * Conditionally add class(es) before the last added or even base .
     * @param condition - If boolean, decides whether to add. If object, adds keys with truthy classNames.
     * @param className - String or array of strings to add.
     * @returns {this}
     */
    insertBefore(condition: ToBeStringCondition, className?: string | string[]): ToBeString;
    /**
     * Merge in entire class strings.
     * @param strings - One or more strings containing classes.
     * @returns {this}
     */
    merge(...strings: string[]): ToBeString;
    /**
     * Finalize the builder and return string.
     * @param className- Extra className to append before finalizing.
     * @returns {string}
     */
    end(className?: string): string;
    /**
     * Convert to lowercase string.
     * @returns {string}
     */
    toLowerCase(): string;
    /**
     * Convert to uppercase string.
     * @returns {string}
     */
    toUpperCase(): string;
    /**
     * Convert to camelCase string.
     * @returns {string}
     */
    toCamelCase(): string;
    /**
     * Convert to Sentence case string.
     * @returns {string}
     */
    toSentenceCase(): string;
    /** @private */
    _push(val: string): void;
    /** @private */
    _unshift(val: string): void;
    /** @private */
    _build(): string;
}
/**
 * Factory helper for convenience.
 * @param {string} [base=""]
 * @returns {ToBeString}
 */
export declare function toBeString(base?: string): ToBeString;
/**
 * Truncate a filename so the total length (including extension) is at most maxLength.
 * If truncation happens, the returned string WILL have length === maxLength.
 *
 * @param {string} name - full filename, e.g. "very long name.mp3"
 * @param {number} maxLength - desired max length (positive integer)
 * @param {string} marker - truncation marker to show in the middle (default "(..)")
 * @returns {string}
 */
export declare function truncateText(name: string, maxLength?: number, marker?: string): string;
export {};
//# sourceMappingURL=helper.d.ts.map