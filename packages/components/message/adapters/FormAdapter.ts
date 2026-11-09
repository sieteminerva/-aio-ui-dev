import type { iModuleDefinition } from "@aio-ui/module-loader/ModuleRegistry";
import type { iFormMessageTarget, iFormModuleContext } from "@aio-ui/form/FormModuleTypes";
import { FORM_MODULE_IDS } from "@aio-ui/form/FormModuleTypes";
import type { iFormMessages } from "@aio-ui/form/FormMessages";
import { composeMessage, messageDraft, resolveStyle } from "@aio-ui/form/FormMessages";
import type { iMessageContent } from "../Message";
import { MessageBuilder } from "../Message";

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
class MessageFormAdapter {
  #messages: iFormMessages | undefined;

  /**
   * @param messages - `config.messages` of the form this adapter serves.
   */
  constructor(messages?: iFormMessages) {
    this.#messages = messages;
  }

  /**
   * Presents one status message next to the form.
   *
   * @param content - Message content; anything it provides wins over config.
   * @param target - Form the message belongs to and whether the action succeeded.
   * @returns Nothing.
   */
  public notify(content: iMessageContent, target: iFormMessageTarget): void {
    if (!content) return;

    // Step 1: Build the draft once; sentence and style both read from it.
    const compose = messageDraft({
      category: "submit",
      slot: target.success ? "success" : "error",
      code: target.success ? "SUBMIT_SUCCESS" : "SUBMIT_FAILED",
      formId: target.form.id,
      fallback: content.message || "",
    });

    const style = resolveStyle(this.#messages, compose);

    // Step 2: Create the toast, anchored to the form so concurrent forms never
    // stack. Duration comes from the config when configured, otherwise from the
    // success/failure default (4s / 6s).
    const toast = new MessageBuilder({
      id: `msg-${target.form.id}`,
      element: target.form,
      duration: style.duration ?? (target.success ? 4000 : 6000),
    });

    // Step 3: Compile the message. `content` wins (a host that passes an explicit
    // sentence means it), then the configured/default sentence.
    toast.prepare({
      header: content.header ?? style.title,
      message: content.message || composeMessage(this.#messages, compose),
      type: content.type ?? style.type,
      icon: content.icon ?? style.icon,
    });

    // Step 4: Wire the close interaction.
    toast.initialize();
  }
}

/**
 * Message module definition.
 *
 * @summary Loaded with the core preset; contributes the `notify` hook.
 *
 * @example
 * // registered by FORM_ADAPTER_DEFINITIONS; no manual wiring needed
 */
export const messageFormAdapter: iModuleDefinition<iFormModuleContext, MessageFormAdapter> = {
  id: FORM_MODULE_IDS.message,

  /**
   * Builds the message adapter.
   *
   * @param context - Host context; provides `config.messages` for the wording.
   * @returns The live adapter.
   */
  load: (context) => new MessageFormAdapter(context.config?.messages),
};
