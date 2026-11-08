import type { iModuleDefinition } from "@aio-ui/module-loader/ModuleRegistry";
import { INPUT_MODULE_IDS, type iInputAdapter, type iInputModuleContext } from "./InputModuleTypes";

/**
 * Popover module.
 *
 * `config.popover` may be an HTML string or a ready element (a date picker, a search
 * panel). The focus/blur plumbing and the value sync-back live here, not in
 * `InputBuilder`, so the field renderer never learns about popovers.
 */
class PopoverInputModule implements iInputAdapter {
  /**
   * Attaches the configured popover to the control.
   *
   * @param _wrapper - The `.field` element.
   * @param control - The rendered control, used as the anchor.
   * @param field - Resolved field payload.
   */
  public decorate(_wrapper: HTMLElement, control: HTMLElement, field: any): void {
    const target = field.config?.popover;
    if (!target) return;

    const popover = typeof target === "string" ? this.#parse(target) : target;
    if (!popover) return;

    if (!popover.hasAttribute("popover")) popover.setAttribute("popover", "manual");

    const anchor = control.id ? `--anchor-${control.id}` : null;
    if (anchor) {
      control.style.setProperty("anchor-name", anchor);
      popover.style.setProperty("position-anchor", anchor);
    }

    // Sits right after the control, so the anchor connection is also a DOM neighbour.
    control.insertAdjacentElement("afterend", popover);

    control.addEventListener("focus", () => {
      if (typeof HTMLElement.prototype.showPopover === "function") popover.showPopover();
    });

    control.addEventListener("blur", (event: FocusEvent) => {
      const related = event.relatedTarget as HTMLElement | null;

      // Focus moved *into* the popover: wait for it to leave before closing, and copy
      // whatever the user picked back into the control — that is the whole point of
      // attaching a picker to a field.
      if (related && popover.contains(related)) {
        popover.addEventListener("blur", (inner: FocusEvent) => {
          const next = inner.relatedTarget as HTMLElement | null;
          if (popover.contains(next) || next === control) return;

          const innerField = popover.querySelector("textarea, input, select") as HTMLInputElement | null;
          if (innerField && "value" in control) {
            (control as HTMLInputElement).value = innerField.value;
            control.dispatchEvent(new Event("input", { bubbles: true }));
            control.dispatchEvent(new Event("change", { bubbles: true }));
          }

          if (typeof HTMLElement.prototype.hidePopover === "function") popover.hidePopover();
        }, { capture: true, once: true });
        return;
      }

      if (typeof HTMLElement.prototype.hidePopover === "function") popover.hidePopover();
    });
  }

  /** Parses an HTML string into a single element. */
  #parse(html: string): HTMLElement | null {
    const holder = document.createElement("div");
    holder.innerHTML = html.trim();
    return holder.firstElementChild as HTMLElement | null;
  }
}

/**
 * Popover module definition.
 *
 * @example
 * // registered by CORE_INPUT_MODULES; drop it and `config.popover` is ignored
 */
export const popoverInputModule: iModuleDefinition<iInputModuleContext, iInputAdapter> = {
  id: INPUT_MODULE_IDS.popover,
  load: () => new PopoverInputModule(),
};
