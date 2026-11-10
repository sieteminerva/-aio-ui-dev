export interface IAddressAdapter {
    init(el: HTMLElement): void;
    setOptions(el: HTMLElement, args: any): void;
    setSelectedOption(el: HTMLElement, value: string): void;
    onLevelChange(el: HTMLElement): void;
    onError(el: HTMLElement, message: string): void;
    getValue(el: HTMLElement): string | null;
    clear(el: HTMLElement): void;
    destroy(el: HTMLElement): void;
}
export declare const IdAddressAdapterBase: IAddressAdapter;
//# sourceMappingURL=id-address-adapter.base.d.ts.map