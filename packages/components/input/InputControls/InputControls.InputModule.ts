import type { iModuleDefinition } from "@aio-ui/module-loader";
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
      actions: cfg.actions,
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
    // One normalisation point: groups, rows and fields all arrive here, so a bare preset
    // name (`"editor"`) is expanded before any selector is asked to render it.
    const actions = normaliseActions(spec.actions);
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
 * Composite presets: one word for a pair of buttons.
 *
 * @summary `editor` is edit+save and `repeater` is add+delete — the two pairs a control set
 * almost always needs together. Expanding them before rendering means the DOM, the pair
 * toggle and every consumer only ever see the four real types.
 */
const ACTION_PRESETS: Record<string, string[]> = {
  editor: ["edit", "save"],
  repeater: ["add", "delete"],
};

/** Human label for a button that was asked for by name only. */
const ACTION_LABELS: Record<string, string> = {
  add: "Add", delete: "Delete", remove: "Remove", edit: "Edit", save: "Save",
  copy: "Copy", search: "Search", custom: "Custom",
};

/**
 * Accepts both action shapes — an array (mixed names and objects) or `{ [type]: definition }`.
 *
 * @param configured - Declared actions.
 * @returns Array form, with composite presets expanded and `type` filled in.
 *
 * @example
 * normaliseActions(["editor", { type: "copy", label: "Copy", onClick }])
 * // → edit, save, copy
 */
export function normaliseActions(configured: any): Array<Record<string, any> & { type: string }> {
  if (!configured) return [];

  const entries: any[] = Array.isArray(configured)
    ? configured.filter(Boolean)
    : Object.entries(configured).map(([type, action]) => ({ ...(action as object), type }));

  const resolved: Array<Record<string, any> & { type: string }> = [];

  for (const entry of entries) {
    // A bare name is a preset: built-in behaviour, label from the type, no callback.
    const preset = typeof entry === "string"
      ? (ACTION_PRESETS[entry] ?? [entry]).map((type) => ({ type, label: ACTION_LABELS[type] ?? type, onClick: () => { } }))
      : (ACTION_PRESETS[entry.type] ?? [entry.type]).map((type) => ({ ...entry, type, label: entry.label ?? ACTION_LABELS[type] ?? type }));

    resolved.push(...preset);
  }

  return resolved;
}

/**
 * Action controls module definition.
 *
 * @example
 * // registered by INPUT_MODULE_DEFINITIONS; drop it and `config.actions` silently renders nothing
 */
export const inputControlsInputModule: iModuleDefinition<iInputModuleContext, iInputAdapter> = {
  id: INPUT_MODULE_IDS.controls,
  load: (context) => new InputControlsInputModule(context),
};
