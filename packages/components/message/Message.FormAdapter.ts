import type { iModuleDefinition } from "@aio-ui/modules/ModuleRegistry";
import type { iFormMessageTarget, iFormModuleContext } from "@aio-ui/form/FormModuleTypes";
import { FORM_MODULE_IDS } from "@aio-ui/form/FormModuleTypes";
import type { iMessageContent } from "./Message";
import { MessageBuilder } from "./Message";

/**
 * Message adapter.
 *
 * @summary Owns every user-facing status toast. `FormBuilder` has no message
 * renderer of its own, so unplugging this adapter only silences feedback — the
 * form keeps working.
 */
class MessageFormAdapter {
  /**
   * Presents one status message next to the form.
   *
   * @param content - Message content; missing fields fall back to success or
   *   failure defaults.
   * @param target - Form the message belongs to and whether the action succeeded.
   * @returns Nothing.
   */
  public notify(content: iMessageContent, target: iFormMessageTarget): void {
    if (!content) return;

    // Step 1: Create the toast, anchored to the form so concurrent forms never stack.
    const toast = new MessageBuilder({
      id: `msg-${target.form.id}`,
      element: target.form,
      duration: target.success ? 4000 : 6000,
    });

    // Step 2: Compile the message with success/failure defaults.
    toast.prepare({
      header: content.header || (target.success ? "Operasi Sukses!" : "Terjadi Kendala"),
      message: content.message || "Data Anda telah diproses oleh orkestrator.",
      type: content.type || (target.success ? "success" : "error"),
      icon: content.icon || (target.success ? "checkmark circle icon" : "icon error"),
    });

    // Step 3: Wire the close interaction.
    toast.initialize();
  }
}

/**
 * Message module definition.
 *
 * @summary Loaded with the core preset; contributes the `notify` hook.
 *
 * @example
 * // registered by CORE_FORM_MODULES; no manual wiring needed
 */
export const messageFormAdapter: iModuleDefinition<iFormModuleContext, MessageFormAdapter> = {
  id: FORM_MODULE_IDS.message,

  /**
   * Builds the message adapter.
   *
   * @param _context - Host context; unused because messages are anchored to the
   *   form passed to each `notify()` call.
   * @returns The live adapter.
   */
  load: (_context) => new MessageFormAdapter(),
};
