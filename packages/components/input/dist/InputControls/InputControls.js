import { Builder } from "@aio-ui/base";
import { collectFormValues } from "../FormValues.js";
/** Every control a set may act on, in document order. */
const CONTROL_SELECTOR = "input, select, textarea";
/** Types `readOnly` does not apply to — those lock through `disabled` instead. */
const READONLY_TYPES = new Set([
    "text", "search", "url", "tel", "email", "password", "number",
    "date", "month", "week", "time", "datetime-local",
]);
/** Controls that are never part of a set's data (buttons, hidden inputs). */
const NOT_DATA_TYPES = new Set(["button", "submit", "reset", "image", "hidden"]);
export class InputControlsBuilder extends Builder {
    builderId = "input-controls";
    name = "input-controls";
    /** Matches the host's key (`@aio-ui/input/controls.css`): resolution is by basename. */
    stylesheet = "./controls.css";
    /** Lock state per control as it was before the set locked it, restored on save. */
    #editableState = new WeakMap();
    /** Scopes already listening for Enter-to-search. */
    #searchBound = new WeakSet();
    constructor(config) {
        super();
        const defaultSelectors = {
            "@controls": { tagName: "div", className: "controls" },
            "@controls>add": { tagName: "button", className: "add", icon: "icon plus" },
            "@controls>delete": { tagName: "button", className: "delete", icon: "icon trash" },
            "@controls>save": { tagName: "button", className: "save", icon: "icon checkmark" },
            "@controls>edit": { tagName: "button", className: "edit", icon: "icon edit" },
            "@controls>copy": { tagName: "button", className: "copy", icon: "icon copy file" },
            "@controls>search": { tagName: "button", className: "search", icon: "icon search" },
            "@controls>custom": { tagName: "button", className: "custom" },
        };
        const defaultConfig = {
            themeId: "default",
            namespace: null,
            selectors: defaultSelectors,
            emit: null,
        };
        this.config = this.resolveConfig(defaultConfig, config);
    }
    /**
     * 🧱 METODE PREPARE
     */
    prepare(payload) {
        const content = payload.content;
        const actions = content.actions ?? [];
        const position = content.position;
        const input = content.input ?? null;
        const scope = (content.scope ?? content.parentElement ?? null);
        // 1. Buat kontainer utama pembungkus tombol aksi
        const container = this.render("@controls", position);
        container.__payload = { actions, scope, input };
        for (const action of actions) {
            const Templatekey = `@controls>${action.type}`;
            const button = this.render(Templatekey, { scope, parentElement: scope, input, action });
            container.appendChild(button);
        }
        // 2. A control set lives inside a form: a button without an explicit type submits it.
        container.querySelectorAll("button").forEach((button) => { button.type = "button"; });
        return container;
    }
    template(typeKey, el, payload, props) {
        switch (typeKey) {
            case "@controls":
                el.setAttribute("position", payload);
                break;
            default:
                const button = el;
                const { action } = payload;
                button.title = "Click to " + action.label;
                button.type = "button";
                if (action?.label) {
                    button.textContent = action.label;
                }
                if (props?.icon) {
                    const icon = document.createElement("i");
                    icon.className = props.icon;
                    button.appendChild(icon);
                }
                button.__payload = payload;
                break;
        }
    }
    /**
     * 🧱 METODE INITIALIZE
     *
     * Applies the edit policy for the scope, then wires every button. Safe to call twice on
     * the same controls (a duplicated group does), because buttons are re-bound by
     * assignment and the Enter listener is bound once per scope.
     */
    initialize(controls, _payload) {
        if (!controls)
            return;
        const actions = (_payload?.content?.actions ?? controls.__payload?.actions ?? []);
        const scope = (_payload?.content?.scope
            ?? _payload?.content?.parentElement
            ?? controls.__payload?.scope
            ?? controls.__payload?.parentElement);
        if (!scope)
            return;
        this.#applyEditPolicy(scope, actions);
        controls.querySelectorAll("button").forEach((button) => {
            this.bindButton(button, controls, actions);
        });
        if (actions.some((action) => action.type === "search"))
            this.#bindEnterToSearch(scope, controls);
        // A set that declares both sides of the toggle shows one available at a time.
        if (actions.some((action) => action.type === "edit"))
            this.#togglePair(controls, "edit");
    }
    bindButton(button, controls, actions) {
        button.onclick = async (event) => {
            event.preventDefault();
            const payload = button.__payload;
            const scope = (payload?.scope ?? payload?.parentElement);
            const action = payload?.action;
            if (!scope || !action)
                return;
            const elements = this.#controls(scope);
            const context = {
                parentElement: scope,
                input: payload?.input ?? null,
                action: action.type,
                button,
                element: elements[0] ?? null,
                value: this.#valueOf(scope, elements),
                values: this.#query(scope),
                event,
            };
            switch (action.type) {
                case "copy":
                    await this.copy(context.values ?? context.value);
                    context.result = context.values ?? context.value;
                    break;
                case "edit":
                    this._unlock(scope);
                    context.result = true;
                    this.toggleEdit(button, controls, "save", actions);
                    break;
                case "save":
                    context.result = this.update(scope);
                    this.toggleEdit(button, controls, "edit", actions);
                    break;
                case "add":
                    context.result = this.duplicate(scope, actions);
                    break;
                case "search":
                    context.result = this.search(scope);
                    break;
                case "delete":
                case "remove":
                    context.result = this.delete(scope);
                    break;
            }
            this.emit(action.type, context);
            // The consumer's own handler runs last, and may be async (a search is a request).
            if (action.type === "search")
                this.#setSearching(scope, true);
            const outcome = action.onClick(scope, context);
            if (action.type === "search") {
                try {
                    await outcome;
                }
                finally {
                    this.#setSearching(scope, false);
                }
            }
        };
    }
    toggleEdit(currentButton, controls, actionType, actions) {
        // When the set declares both sides, they are a pair: enable the counterpart and step
        // back. Replacing the button instead would append a second "Simpan" next to the one
        // that was already there.
        //
        // The pair is only a pair when **both** buttons exist: a set may declare `edit` alone
        // (`actions: ["edit"]` without `save`), and the first click then swaps edit → save.
        // Bailing out on the pair branch regardless left that swap as the last thing that ever
        // happened — the second click had nothing to switch back to and the set went dead.
        if ((actionType === "edit" || actionType === "save")
            && actions.some((action) => action.type === actionType)
            && this.#togglePair(controls, actionType)) {
            return;
        }
        const payload = currentButton.__payload;
        const editAction = {
            type: actionType,
            label: actionType,
            onClick: () => { },
        };
        const editButton = this.render(`@controls>${actionType}`, {
            scope: payload.scope ?? payload.parentElement,
            parentElement: payload.scope ?? payload.parentElement,
            input: payload.input,
            action: editAction,
        });
        if (!editButton)
            return;
        currentButton.replaceWith(editButton);
        this.bindButton(editButton, controls, actions);
    }
    /**
     * Makes exactly one of `edit`/`save` available.
     *
     * @param controls - The controls node holding the pair.
     * @param actionType - Which side to enable.
     * @returns `true` when both buttons exist and the switch happened; `false` when the set
     *   has only one side, so the caller must swap the button itself.
     */
    #togglePair(controls, actionType) {
        const edit = controls.querySelector("button.edit");
        const save = controls.querySelector("button.save");
        if (!edit || !save)
            return false;
        edit.disabled = actionType !== "edit";
        save.disabled = actionType !== "save";
        return true;
    }
    emit(action, context) {
        this.config.emit?.("elementChanged", {
            builder: this.builderId,
            type: `@controls>${action}`,
            element: context.parentElement,
            data: {
                action,
                value: context.value,
                values: context.values,
                input: context.input,
                result: context.result,
            },
        });
    }
    async copy(payload) {
        try {
            const text = typeof payload === "string" ? payload : JSON.stringify(payload);
            await navigator.clipboard.writeText(text);
        }
        catch (err) {
            console.error("Gagal menyalin teks: ", err);
        }
    }
    /**
     * Clones the whole scope — a field or an entire group — under a fresh index.
     *
     * @param scope - Element to duplicate.
     * @param actions - Action set the clone receives.
     * @returns The clone.
     */
    duplicate(scope, actions) {
        const clone = scope.cloneNode(true);
        const owner = scope.parentElement ?? scope;
        const index = this.#duplicateIndex(scope, owner);
        const suffix = `-${index}`;
        const labelSuffix = ` ${index}`;
        if (clone.id)
            clone.id += suffix;
        clone.querySelectorAll("[id]").forEach((element) => { element.id += suffix; });
        clone.querySelectorAll("label").forEach((label) => {
            if (label.textContent?.trim())
                label.textContent += labelSuffix;
        });
        clone.querySelectorAll("input,select,textarea").forEach((element) => {
            if (element.name)
                element.name += suffix;
            if (element instanceof HTMLInputElement && (element.type === "checkbox" || element.type === "radio"))
                element.checked = false;
            else
                element.value = "";
        });
        scope.after(clone);
        // The clone carries the *locked* DOM, not the state the source started in. Left alone,
        // its snapshot would record "readonly/disabled" as the baseline and Edit could never
        // open it — which is exactly what a repeated group showed. The source keeps the
        // pre-lock state, so the clone is reset from it (by position) before initialising.
        const sourceControls = this.#controls(scope);
        this.#controls(clone).forEach((control, index) => {
            const state = this.#editableState.get(sourceControls[index]);
            const valueInput = this.#dropdownValue(control);
            if (state) {
                control.disabled = state.disabled;
                if (this.#supportsReadOnly(control))
                    control.readOnly = state.readonly;
                if (valueInput)
                    valueInput.disabled = state.valueDisabled ?? false;
            }
            else if (!this.#isEditable(control)) {
                control.disabled = false;
                if (this.#supportsReadOnly(control))
                    control.readOnly = false;
                if (valueInput)
                    valueInput.disabled = false;
            }
        });
        clone.removeAttribute("data-locked");
        clone.classList.remove("locked");
        clone.querySelectorAll("[data-locked]").forEach((element) => element.removeAttribute("data-locked"));
        // Marks the copy as its own instance: the cascade resolves a conditional field inside
        // the copy that owns it (`sku` → `sku-1`) instead of the first one in the document.
        clone.setAttribute("data-instance", "true");
        const clonedControls = clone.querySelector(".controls");
        const sourceButtons = scope.querySelectorAll(".controls button");
        clonedControls?.querySelectorAll("button").forEach((button, index) => {
            const sourcePayload = sourceButtons[index]?.__payload;
            if (sourcePayload) {
                // The clone's own scope, never the original's: a duplicated group acts on itself.
                button.__payload = {
                    ...sourcePayload,
                    scope: clone,
                    parentElement: clone,
                };
            }
        });
        if (clonedControls) {
            clonedControls.__payload = {
                actions,
                scope: clone,
                parentElement: clone,
                input: sourceButtons[0]?.__payload?.input ?? null,
            };
            this.initialize(clonedControls, { content: { actions, scope: clone } });
        }
        // A new scope is new DOM the engines have not seen: it copied whatever state the
        // source was in (a visible conditional field, a locked control). Announcing it lets
        // the cascade re-evaluate the copy against the copy's own (empty) values.
        clone.dispatchEvent(new CustomEvent("scopeAdded", { bubbles: true, detail: { scope: clone } }));
        return clone;
    }
    delete(scope) {
        // Never a whole form: a control set edits records, it does not delete the container
        // the visitor is filling in.
        if (scope.tagName === "FORM")
            return false;
        scope.remove();
        return true;
    }
    /** Saving: every control returns to the lock state it had before `edit`, then reports. */
    update(scope) {
        this._lock(scope);
        for (const control of this.#controls(scope)) {
            control.dispatchEvent(new Event("change", { bubbles: true }));
        }
        return true;
    }
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
    search(scope) {
        const query = this.#query(scope);
        scope.dispatchEvent(new CustomEvent("search", { detail: { query, scope }, bubbles: true }));
        return query;
    }
    /**
     * Applies the edit policy for a scope.
     *
     * @param scope - Field or group.
     * @param actions - Declared action set.
     *
     * @summary Two sides of one rule: with an `edit` action the scope starts **locked**
     * (a record viewer until the visitor asks to edit), and without one it must not be
     * left locked — nothing could unlock it. "Locked by this set" is answered by the set's
     * own bookkeeping (`data-locked` + the per-control snapshot), never by looking at
     * `readonly`/`disabled`: those properties reflect to attributes, so an author's lock
     * and one of ours look identical in the DOM.
     */
    #applyEditPolicy(scope, actions) {
        if (actions.some((action) => action.type === "edit")) {
            this._lock(scope);
            return;
        }
        const lockedBySet = scope.getAttribute("data-locked") === "true"
            || this.#controls(scope).some((control) => this.#editableState.has(control));
        if (lockedBySet)
            this._unlock(scope, true);
    }
    /** Locks every control in the scope, remembering what it looked like. */
    _lock(scope) {
        for (const control of this.#controls(scope)) {
            // A field the schema marked editable is not the set's to lock.
            if (this.#isEditable(control))
                continue;
            const dropdown = this.#dropdownRoot(control);
            const valueInput = dropdown ? this.#dropdownValue(control) : null;
            if (!this.#editableState.has(control)) {
                this.#editableState.set(control, {
                    readonly: this.#supportsReadOnly(control) ? control.readOnly : false,
                    disabled: control.disabled,
                    valueDisabled: valueInput?.disabled,
                });
            }
            if (dropdown) {
                // A dropdown is two inputs and a menu: locking the visible box alone leaves the
                // popover open and the submitted value live. Disabled is the only state that
                // actually stops the interaction, and it also stops the menu from opening.
                control.disabled = true;
                if (valueInput)
                    valueInput.disabled = true;
                dropdown.setAttribute("data-locked", "true");
            }
            else if (control instanceof HTMLSelectElement) {
                // A select has no readOnly: disabled is the only lock the platform offers.
                control.disabled = true;
            }
            else if (this.#supportsReadOnly(control)) {
                control.readOnly = true;
            }
            else {
                control.disabled = true;
            }
        }
        scope.setAttribute("data-locked", "true");
        scope.classList.add("locked");
    }
    /**
     * The `div.dropdown` a control belongs to, when it is a custom dropdown.
     *
     * @param control - Control being locked or unlocked.
     * @returns The dropdown container, or `null` for a plain control.
     *
     * @summary `closest()` matches the element itself and the visible box is itself
     * `input.dropdown`, so the walk starts at the parent — otherwise the "container" would
     * be the box and the hidden value would never be found.
     */
    #dropdownRoot(control) {
        const root = control.parentElement?.closest(".dropdown") ?? null;
        return root && root !== control ? root : null;
    }
    /** The hidden input of a dropdown: the value that actually submits. */
    #dropdownValue(control) {
        return this.#dropdownRoot(control)?.querySelector("input[type='hidden']") ?? null;
    }
    /**
     * Whether the schema gave this control to the visitor permanently.
     *
     * @param control - Control being considered for a lock.
     * @returns `true` when the field (or an ancestor scope) declares `editable`.
     *
     * @summary `editable: true` outranks the edit policy: a record viewer with an `edit`
     * action may still expose one field that is always live (a comment box, a quantity).
     * `InputBuilder` writes the marker on the field wrapper, so an ancestor lookup covers a
     * group whose fields each decide for themselves.
     */
    #isEditable(control) {
        return Boolean(control.closest("[data-editable='true']"));
    }
    /**
     * Restores every control in the scope.
     *
     * @param scope - Field or group.
     * @param force - Open controls that carry no snapshot. Used when the scope is known to
     *   have been locked by this set (a duplicate, a re-render) — leaving them locked would
     *   reproduce exactly the trap the policy exists to avoid.
     */
    _unlock(scope, force = false) {
        for (const control of this.#controls(scope)) {
            const state = this.#editableState.get(control);
            const dropdown = this.#dropdownRoot(control);
            const valueInput = dropdown ? this.#dropdownValue(control) : null;
            if (state) {
                control.disabled = state.disabled;
                if (this.#supportsReadOnly(control))
                    control.readOnly = state.readonly;
                if (valueInput)
                    valueInput.disabled = state.valueDisabled ?? false;
                this.#editableState.delete(control);
            }
            else if (force) {
                control.disabled = false;
                if (this.#supportsReadOnly(control))
                    control.readOnly = false;
                if (valueInput)
                    valueInput.disabled = false;
            }
            dropdown?.removeAttribute("data-locked");
        }
        scope.removeAttribute("data-locked");
        scope.classList.remove("locked");
    }
    /** Enter inside a text control of a searching set runs the search. */
    #bindEnterToSearch(scope, controls) {
        if (this.#searchBound.has(scope))
            return;
        this.#searchBound.add(scope);
        scope.addEventListener("keydown", (event) => {
            if (event.key !== "Enter")
                return;
            const target = event.target;
            // Enter is a newline in a textarea, and a button already does its own thing.
            if (!(target instanceof HTMLElement) || target instanceof HTMLTextAreaElement)
                return;
            if (!this.#controls(scope).includes(target))
                return;
            const button = controls.querySelector("button.search");
            if (!button)
                return;
            event.preventDefault();
            button.click();
        });
    }
    #setSearching(scope, searching) {
        scope.classList.toggle("searching", searching);
        if (searching)
            scope.setAttribute("aria-busy", "true");
        else
            scope.removeAttribute("aria-busy");
    }
    /** Controls of a scope that carry data, in document order. */
    #controls(scope) {
        return Array.from(scope.querySelectorAll(CONTROL_SELECTOR))
            .filter((control) => !(control instanceof HTMLInputElement && NOT_DATA_TYPES.has(control.type)));
    }
    /** One control's value, or every value of a group, for `context.value`. */
    #valueOf(scope, elements) {
        if (elements.length === 1)
            return elements[0].value;
        const query = this.#query(scope);
        return Object.entries(query)
            .map(([key, value]) => `${key}=${Array.isArray(value) ? value.join(",") : String(value)}`)
            .join("&");
    }
    /**
     * The scope's values, in submit vocabulary.
     *
     * @param scope - Field, fieldset or form.
     * @returns Payload keyed by control name.
     */
    #query(scope) {
        const collectable = scope instanceof HTMLFormElement
            || (typeof HTMLFieldSetElement !== "undefined" && scope instanceof HTMLFieldSetElement);
        // `collectFormValues` walks the `elements` of a form/fieldset; a `.field` wrapper has
        // none, and its single control is named, so it is read directly.
        if (collectable)
            return collectFormValues(scope, { excludeEmpty: true });
        const control = this.#controls(scope)[0];
        if (!control?.name)
            return {};
        if (control instanceof HTMLInputElement && (control.type === "checkbox" || control.type === "radio")) {
            return control.checked ? { [control.name]: true } : {};
        }
        return control.value === "" ? {} : { [control.name]: control.value };
    }
    /** Whether `readOnly` actually locks this control. */
    #supportsReadOnly(control) {
        if (control instanceof HTMLSelectElement)
            return false;
        if (control instanceof HTMLTextAreaElement)
            return true;
        return READONLY_TYPES.has(control.type);
    }
    /**
     * The next free `<base>-<n>` suffix for a clone of `scope`.
     *
     * @param scope - Element being duplicated.
     * @param owner - Parent whose children share the naming space.
     * @returns The first suffix not already used by a sibling clone.
     *
     * @summary Only ids that extend the same base are counted, so `rec-1` yields
     * `rec-1-1` (not `rec-1-2`): the suffix belongs to the clone chain, not to whatever
     * number the author put at the end of the original id.
     */
    #duplicateIndex(scope, owner) {
        const base = scope.id || scope.tagName.toLowerCase();
        const taken = new Set();
        Array.from(owner.children).forEach((child) => {
            const id = child.id;
            if (!id || !id.startsWith(`${base}-`))
                return;
            const suffix = Number(id.slice(base.length + 1));
            if (Number.isInteger(suffix) && suffix >= 1)
                taken.add(suffix);
        });
        let index = 1;
        while (taken.has(index))
            index += 1;
        return index;
    }
}
//# sourceMappingURL=InputControls.js.map