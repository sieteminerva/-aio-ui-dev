/**
 * 🧩 INPUT ADAPTER — dropdown rendering for `InputBuilder`.
 *
 * Owned by the input layer, not by `FormBuilder`. Two surfaces:
 * - `style: "select"` (default) renders a popover menu (`.menu[popover]`) anchored to the control.
 * - `style: "datalist"` renders a native `<datalist>`.
 */
import type { iBuilderConfig, iBuilderRegistry } from "@aio-ui/core/interface";
import { Builder } from "@aio-ui/base";
export type DropdownElementType = "@dropdown" | "@dropdown>label" | "@dropdown>input" | "@dropdown>hidden" | "@dropdown>list" | "@dropdown>list>option" | "@dropdown>menu" | "@dropdown>menu>item" | "@dropdown>menu>empty" | "@dropdown>tags" | "@dropdown>tags>item";
export interface iDropdownOption {
    id: string | number;
    label: string;
}
export interface iDropdownConfig extends iBuilderConfig<DropdownElementType> {
    attributes?: Array<{
        name: string;
        value: string;
    }>;
    apiUrl?: string | null;
    debounceDelay?: number;
    style?: string;
    onSelect?: (value: string, id: string | null) => void;
    min?: number;
    max?: number;
    isMultiple?: boolean;
    onMultiChange?: (items: iDropdownOption[]) => void;
}
export interface iDropdownContent {
    id?: string;
    name?: string;
    title?: string;
    placeholder?: string;
    value?: string | number | null;
    options?: iDropdownOption[];
    attributes?: Array<{
        name: string;
        value: string;
    }>;
}
export interface iDropdownState {
    options: iDropdownOption[];
    selectedMultiItems: iDropdownOption[];
    keyword: string;
    isLoading: boolean;
    value: string;
}
export declare class DropdownBuilder extends Builder<DropdownElementType, iDropdownConfig> {
    #private;
    readonly builderId: keyof iBuilderRegistry;
    readonly name: keyof iBuilderRegistry;
    readonly stylesheet: string;
    private listId;
    private debounceTimeout;
    private abortController;
    constructor(config: Partial<iDropdownConfig>);
    protected template(typeKey: DropdownElementType, el: HTMLElement, payload?: any): void;
    prepare(content: any, _config?: Required<iDropdownConfig> | undefined): HTMLElement;
    initialize(el?: HTMLElement, _payload?: any, _context?: any): void;
    private initDatalistMode;
    private initSelectMode;
    private handleSelectSearch;
    private filterMenu;
    private handleSearch;
    renderOptions(listEl: HTMLElement): void;
    private renderLocalOptions;
    renderTags(tagsContainerEl: HTMLDivElement): void;
    private renderInputState;
    /**
     * 🔔 Event `change` BAWAAN (default) — meniru semantik <select>/<input> native:
     * 1. Ditembak pada input tersembunyi (pembawa atribut `name`), BUKAN input teks:
     *    - BuilderProxy.bind() menempelkan listener `change` LANGSUNG di elemen [name].
     *    - Delegasi form (Cascade.attach) menangkap event yang menggelembung dari sana.
     * 2. Hanya ditembak jika `#state.value` benar-benar berbeda dari `prevValue`
     *    (klik item yang sama / hapus tag yang tidak ada TIDAK memicu change — persis native).
     * 3. `bubbles: true` mengikuti konvensi codebase (InputControls/Cascade/FileUploader).
     */
    private emitChange;
    private removeTag;
    /**
     * Lifecycle: batalkan semua listener (via AbortController), bersihkan debounce,
     * lalu serahkan pembersihan DOM/registry ke induk Builder.
     */
    destroy(typeKey?: DropdownElementType): void;
    private applyAttributes;
}
//# sourceMappingURL=Dropdown.d.ts.map