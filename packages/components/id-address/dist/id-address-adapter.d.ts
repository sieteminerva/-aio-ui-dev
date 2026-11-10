export interface ISetOptionsParamsConfig {
    options?: any;
    state?: "loading" | "start" | "ready" | "complete" | "empty" | "error";
    onLevelChange?: Function;
}
export interface ISetOptionsFunction {
    (element: HTMLInputElement | HTMLSelectElement, config?: ISetOptionsParamsConfig): void;
}
export interface IAddressAdapter {
    onLevelChange?: Function;
    setOptions: ISetOptionsFunction;
    setSelectedOption: Function;
    clear: Function;
    init?: Function;
    onError?: Function;
    getValue?: Function;
    destroy?: Function;
    selector?: Object;
    textContent?: Object;
}
export declare const setPlaceholderText: (element: HTMLInputElement | HTMLSelectElement, text: string) => HTMLInputElement | HTMLSelectElement;
export declare function __setloadingState(el: HTMLInputElement | HTMLSelectElement, level: any, state?: string, placeholderEl?: HTMLInputElement | null): void;
export declare function __setErrorState(el: HTMLInputElement | HTMLSelectElement, level: any, _message: string, placeholderEl?: HTMLInputElement | null): void;
//# sourceMappingURL=id-address-adapter.d.ts.map