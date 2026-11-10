/**
 * 🧩 INPUT ADAPTER — interactive control set for `InputBuilder` and for a group of inputs.
 *
 * Owned by the input layer, not by `FormBuilder`: a field that declares actions — and a
 * group (`<fieldset>`) that declares them — delegates its button set and click behaviour
 * to this builder.
 *
 * The unit of work is a **scope**, not a control: a `.field` wrapper (one control) or a
 * `<fieldset class="form-group">` (many). Everything below reads the scope, so `edit`
 * locks every control in the group, `search` collects every value in it, and `add`
 * duplicates the group rather than a single input. `<form>` is deliberately not a scope:
 * a control set that can delete or clone the whole form is a footgun, not a feature.
 */
import type { iActionType, iBasicInputNode, iInputActionContext, iInputActionDefinition } from "../Input";
import type { iBuilderConfig, iElementProperty } from "@aio-ui/core/interface";
import { Builder } from "@aio-ui/base";
export type InputControlsElementType = "@controls" | "@controls>add" | "@controls>delete" | "@controls>save" | "@controls>edit" | "@controls>copy" | "@controls>search" | "@controls>custom";
/** Payload handed to the controls builder by whoever owns the scope. */
export interface iInputControlsConfig {
    position?: "left" | "right";
    actions: iInputActionDefinition[];
    input?: iBasicInputNode | null;
    /** Element the set acts on: a `.field` wrapper or a `<fieldset>` group. */
    scope?: HTMLElement | null;
    /** Legacy name for `scope`; still honoured so old call sites keep working. */
    parentElement?: HTMLElement | null;
}
export declare class InputControlsBuilder extends Builder<InputControlsElementType> {
    #private;
    readonly builderId = "input-controls";
    readonly name = "input-controls";
    /** Matches the host's key (`@aio-ui/input/controls.css`): resolution is by basename. */
    readonly stylesheet: string;
    constructor(config: iBuilderConfig<InputControlsElementType>);
    /**
     * 🧱 METODE PREPARE
     */
    prepare(payload: any): HTMLElement;
    protected template(typeKey: InputControlsElementType, el: HTMLElement, payload?: any, props?: iElementProperty): void;
    /**
     * 🧱 METODE INITIALIZE
     *
     * Applies the edit policy for the scope, then wires every button. Safe to call twice on
     * the same controls (a duplicated group does), because buttons are re-bound by
     * assignment and the Enter listener is bound once per scope.
     */
    initialize(controls: HTMLElement, _payload?: any): void;
    private bindButton;
    protected toggleEdit(currentButton: HTMLButtonElement, controls: HTMLElement, actionType: iActionType, actions: iInputActionDefinition[]): void;
    protected emit(action: iActionType, context: iInputActionContext): void;
    protected copy(payload: string | HTMLElement | Object): Promise<void>;
    /**
     * Clones the whole scope — a field or an entire group — under a fresh index.
     *
     * @param scope - Element to duplicate.
     * @param actions - Action set the clone receives.
     * @returns The clone.
     */
    protected duplicate(scope: HTMLElement, actions: iInputActionDefinition[]): HTMLElement;
    protected delete(scope: HTMLElement): boolean;
    /** Saving: every control returns to the lock state it had before `edit`, then reports. */
    protected update(scope: HTMLElement): boolean;
    /**
     * Collects the scope's values and tells everyone who listens.
     *
     * @param scope - Field or group the set belongs to.
     * @returns The query, already handed to `onClick` as `context.result`.
     *
     * @summary `search` is a **read**, not a submit: it takes the same vocabulary a submit
     * would (`collectFormValues`), dispatches a bubbling `search` CustomEvent on the scope
     * so the owning page can react without knowing this builder, and leaves the payload in
     * `context.result` for `onClick`. The scope is marked `searching` (and `aria-busy`) while
     * `onClick`'s promise is pending, so an async query shows a state without this layer
     * knowing what a request is.
     */
    protected search(scope: HTMLElement): Record<string, any>;
    /** Locks every control in the scope, remembering what it looked like. */
    private _lock;
    /**
     * Restores every control in the scope.
     *
     * @param scope - Field or group.
     * @param force - Open controls that carry no snapshot. Used when the scope is known to
     *   have been locked by this set (a duplicate, a re-render) — leaving them locked would
     *   reproduce exactly the trap the policy exists to avoid.
     */
    private _unlock;
}
//# sourceMappingURL=InputControls.d.ts.map