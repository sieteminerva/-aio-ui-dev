/**
 * id-address — kit.
 *
 * The column vocabulary and the runtime guard that enforces it: which keys a detail
 * record may carry, and what type each one accepts. Both are machinery — the picker
 * itself never exposes them.
 *
 * Not published: `index.ts` is the only entry and does not mention this file.
 */
export const ADDRESS_DETAIL_KEYS = [
    "propinsi", "propinsi_id", "propinsi_name",
    "kota", "kota_id", "kota_name",
    "kecamatan", "kecamatan_id", "kecamatan_name",
    "kelurahan", "kelurahan_id", "kelurahan_name",
    "kodepos", "kodepos_id", "kodepos_name",
    "latitude", "longitude", "formatted_address"
];
/**
 * Runtime type guard for IAddressDetail
 * @param {IAddressDetail} obj
 * @returns {boolean}
 */
export function isAddressDetail(obj) {
    // 1. Validasi dasar tipe objek
    if (typeof obj !== "object" || obj === null)
        return false;
    // 2. Ambil semua entri kunci dan nilai objek
    const entries = Object.entries(obj);
    for (const [key, value] of entries) {
        // 3. Validasi apakah kunci terdaftar di ADDRESS_DETAIL_KEYS
        if (!ADDRESS_DETAIL_KEYS.includes(key)) {
            console.error(`Invalid key: "${key}" is not a valid IdAddressDetailKey.`);
            return false;
        }
        // 4. Validasi tipe nilai dari kunci tersebut
        if (!isValidAddressDetailValue(key, value)) {
            console.error(`Invalid value type for key "${key}":`, value);
            return false;
        }
    }
    return true;
}
/**
 * Validates the data type of a specific address detail field based on its key name.
 *
 * @param {IdAddressDetailKey} key - The property name to validate (e.g., 'propinsi_id', 'latitude').
 * @param {any} value - The value to check against the expected type for the given key.
 * @returns {boolean} True if the value matches the expected type or is nullable; otherwise false.
 *
 * @example
 * isValidAddressDetailValue('propinsi_id', 31); // true
 * isValidAddressDetailValue('latitude', ' -6.2000'); // true
 * isValidAddressDetailValue('formatted_address', 123); // false
 *
 * @description
 * How it works: The function uses a series of conditional checks based on key suffixes or
 * exact matches. It allows null/undefined for all keys, ensures IDs and coordinates are
 * numeric (or numeric strings), and verifies that names and addresses are strings.
 */
function isValidAddressDetailValue(key, value) {
    // Step 1: Allow null or undefined values as they represent empty states.
    if (value === null || value === undefined)
        return true;
    // Step 2: Validate ID fields. Must be a number or a non-empty numeric string.
    if (key.endsWith("_id")) {
        return typeof value === "number" || (typeof value === "string" && value.trim() !== "" && !Number.isNaN(Number(value)));
    }
    // Step 3: Validate Name fields. Usually strings, but kodepos_name can be a number.
    if (key.endsWith("_name")) {
        return typeof value === "string" || (key === "kodepos_name" && typeof value === "number");
    }
    // Step 4: Validate Coordinates. Must be a number or a non-empty numeric string.
    if (key === "latitude" || key === "longitude") {
        return typeof value === "number" || (typeof value === "string" && value.trim() !== "" && !Number.isNaN(Number(value)));
    }
    // Step 5: Validate formatted address. Must be a string.
    if (key === "formatted_address") {
        return typeof value === "string";
    }
    // Step 6: Return false if the key does not match any known validation rules.
    return false;
}
//# sourceMappingURL=id-address.kit.js.map