import type { iModuleDefinition } from "@aio-ui/module-loader/ModuleRegistry";
import { InputControlsBuilder } from "./InputControls";
import { INPUT_MODULE_IDS, type iInputCollaborator, type iInputModuleContext } from "../InputModuleTypes";

/**
 * Action controls module.
 *
 * A field that declares `config.actions` gets a button set beside it (add/remove/edit/
 * save/…). The button markup and its click behaviour belong to `InputControlsBuilder`;
 * this module is the only thing that knows that, so `InputBuilder` stays a renderer.
 */
class InputControlsInputModule implements iInputCollaborator {
  readonly #context: iInputModuleContext;

  constructor(context: iInputModuleContext) {
    this.#context = context;
  }

  /**
   * Appends the action set to a field that asked for one.
   *
   * @param wrapper - The `.field` element.
   * @param _control - The rendered control (unused: actions attach to the wrapper).
   * @param field - Resolved field payload.
   */
  public decorate(wrapper: HTMLElement, _control: HTMLElement, field: any): void {
    const cfg = field.config ?? {};
    if (!cfg.actions) return;

    const configured = cfg.actions || [];
    const actions = Array.isArray(configured)
      ? configured
      : Object.entries(configured).map(([type, action]) => ({ ...(action as object), type }));

    const controls = new InputControlsBuilder(this.#context.builderConfig as any).create({
      content: {
        parentElement: wrapper,
        position: cfg.position || "right",
        actions,
        input: field,
      },
    });

    wrapper.classList.add("actions");
    wrapper.appendChild(controls);
  }
}

/**
 * Action controls module definition.
 *
 * @example
 * // registered by CORE_INPUT_MODULES; drop it and `config.actions` silently renders nothing
 */
export const inputControlsInputModule: iModuleDefinition<iInputModuleContext, iInputCollaborator> = {
  id: INPUT_MODULE_IDS.controls,
  load: (context) => new InputControlsInputModule(context),
};
