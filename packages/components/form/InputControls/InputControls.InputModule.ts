import type { iModuleDefinition } from "@aio-ui/module-loader/ModuleRegistry";
import { InputControlsBuilder } from "./InputControls";
import { INPUT_MODULE_IDS, type iInputActionsSpec, type iInputAdapter, type iInputModuleContext } from "../InputModuleTypes";

/**
 * Action controls module.
 *
 * A field that declares `config.actions` gets a button set beside it (add/remove/edit/
 * save/…), and a group that declares `actions` gets the same set on its `<fieldset>`.
 * The button markup and its click behaviour belong to `InputControlsBuilder`; this module
 * is the only thing that knows that, so `InputBuilder` and `FormBuilder` stay renderers.
 */
class InputControlsInputModule implements iInputAdapter {
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

    const controls = this.renderActions(wrapper, {
      actions: normaliseActions(cfg.actions),
      position: cfg.position || "right",
      input: field,
    });
    if (!controls) return;

    wrapper.classList.add("actions");
    wrapper.appendChild(controls);
  }

  /**
   * Builds the button set for any scope: a single field wrapper or a whole group.
   *
   * @param scope - Element the set acts on (`.field` or `<fieldset>`).
   * @param spec - Actions, position, and the field when there is one.
   * @returns The controls node, or `null` when nothing was declared.
   */
  public renderActions(scope: HTMLElement, spec: iInputActionsSpec): HTMLElement | null {
    const actions = spec.actions ?? [];
    if (!actions.length) return null;

    return new InputControlsBuilder(this.#context.builderConfig as any).create({
      content: {
        scope,
        parentElement: scope,
        position: spec.position || "right",
        actions,
        input: spec.input ?? null,
      },
    });
  }
}

/**
 * Accepts both action shapes: an array, or `{ [type]: definition }` (the demo's shape).
 *
 * @param configured - Declared actions.
 * @returns Array form with `type` filled in.
 */
export function normaliseActions(configured: any): Array<Record<string, any> & { type: string }> {
  if (!configured) return [];
  if (Array.isArray(configured)) return configured.filter(Boolean);
  return Object.entries(configured).map(([type, action]) => ({ ...(action as object), type }));
}

/**
 * Action controls module definition.
 *
 * @example
 * // registered by CORE_INPUT_MODULES; drop it and `config.actions` silently renders nothing
 */
export const inputControlsInputModule: iModuleDefinition<iInputModuleContext, iInputAdapter> = {
  id: INPUT_MODULE_IDS.controls,
  load: (context) => new InputControlsInputModule(context),
};
