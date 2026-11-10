import type { iBuilderConfig, iBuilderRegistry } from "@aio-ui/core/interface";
import { Builder } from "@aio-ui/base";
export type MessageElementType = "@message" | "@message>close" | "@message>content" | "@message>content>header" | "@message>content>desc" | "@message>content>icon";
export interface iMessageContent {
    header?: string;
    message: string;
    icon?: string;
    type?: string;
}
export interface iMessageConfig extends iBuilderConfig<MessageElementType> {
    id?: string;
    element?: HTMLElement | string;
    duration?: number;
    persist?: boolean;
    onOpen?: (el: HTMLElement) => void;
    onClose?: (el: HTMLElement) => void;
}
export declare class MessageBuilder extends Builder<MessageElementType, iMessageConfig> {
    readonly builderId: keyof iBuilderRegistry;
    readonly name: keyof iBuilderRegistry;
    readonly stylesheet: string;
    config: Required<iMessageConfig>;
    private _activeTimers;
    constructor(config?: Partial<iMessageConfig>);
    prepare(content: Partial<iMessageContent>, _config?: Partial<iMessageConfig>): HTMLElement;
    protected template(typeKey: MessageElementType, el: HTMLElement, payload?: any): void;
    initialize(): void;
    protected unmount(id: string, onCloseCallback?: (el: HTMLElement) => void): void;
    private _startTimeoutCounter;
}
//# sourceMappingURL=Message.d.ts.map