import { type IAddressAdapter } from "./id-address-adapter";
export declare const IdAddressAdapterAio: IAddressAdapter;
declare global {
    interface HTMLSelectElement {
        /** This adapter's own `change` listener, so re-initialising never doubles it. */
        __aioChangeHandler?: (event: Event) => void;
    }
    interface HTMLInputElement {
        __aioChangeHandler?: (event: Event) => void;
    }
}
//# sourceMappingURL=id-address-adapter.aio.d.ts.map