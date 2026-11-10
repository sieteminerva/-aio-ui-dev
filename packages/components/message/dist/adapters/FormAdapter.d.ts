import type { iModuleDefinition } from "@aio-ui/module-loader";
import type { iFormMessageTarget, iFormModuleContext } from "@aio-ui/form/FormModuleTypes";
import type { iFormMessages } from "@aio-ui/form/FormMessages";
import type { iMessageContent } from "../Message";
/**
 * Message adapter.
 *
 * @summary Owns every user-facing status toast. `FormBuilder` has no message
 * renderer of its own, so unplugging this adapter only silences feedback — the
 * form keeps working.
 *
 * Sentences are not written here: the adapter reads `config.messages.submit`,
 * so wording and toast presentation belong to the form, not to the renderer.
 */
declare class MessageFormAdapter {
    #private;
    /**
     * @param messages - `config.messages` of the form this adapter serves.
     */
    constructor(messages?: iFormMessages);
    /**
     * Presents one status message next to the form.
     *
     * @param content - Message content; anything it provides wins over config.
     * @param target - Form the message belongs to and whether the action succeeded.
     * @returns Nothing.
     */
    notify(content: iMessageContent, target: iFormMessageTarget): void;
}
/**
 * Message module definition.
 *
 * @summary Loaded with the core preset; contributes the `notify` hook.
 *
 * @example
 * // registered by FORM_ADAPTER_DEFINITIONS; no manual wiring needed
 */
export declare const messageFormAdapter: iModuleDefinition<iFormModuleContext, MessageFormAdapter>;
export {};
//# sourceMappingURL=FormAdapter.d.ts.map