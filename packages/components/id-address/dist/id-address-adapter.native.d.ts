import { type IAddressAdapter } from "./id-address-adapter";
declare global {
    interface HTMLSelectElement {
        __nativeChangeHandler: (e: Event) => any;
        __onLevelChange: (e: any) => any;
        __kodeposHandler: (e: any) => any;
        __isDropdown: boolean;
    }
    interface HTMLInputElement {
        __nativeChangeHandler: (e: Event) => any;
        __onLevelChange: (e: any) => any;
        __kodeposHandler: (e: any) => any;
        __isDropdown: boolean;
    }
}
export declare const IdAddressAdapterNative: IAddressAdapter;
//# sourceMappingURL=id-address-adapter.native.d.ts.map