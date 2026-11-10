/**
 * id-address — kit.
 *
 * The column vocabulary and the runtime guard that enforces it: which keys a detail
 * record may carry, and what type each one accepts. Both are machinery — the picker
 * itself never exposes them.
 *
 * Not published: `index.ts` is the only entry and does not mention this file.
 */
export declare const ADDRESS_DETAIL_KEYS: readonly ["propinsi", "propinsi_id", "propinsi_name", "kota", "kota_id", "kota_name", "kecamatan", "kecamatan_id", "kecamatan_name", "kelurahan", "kelurahan_id", "kelurahan_name", "kodepos", "kodepos_id", "kodepos_name", "latitude", "longitude", "formatted_address"];
export type IdAddressDetailKey = typeof ADDRESS_DETAIL_KEYS[number];
type IdAddressDetail = {
    [key in IdAddressDetailKey]?: string | number | undefined | null;
};
/**
 * Runtime type guard for IAddressDetail
 * @param {IAddressDetail} obj
 * @returns {boolean}
 */
export declare function isAddressDetail(obj: unknown): obj is IdAddressDetail;
export {};
//# sourceMappingURL=id-address.kit.d.ts.map