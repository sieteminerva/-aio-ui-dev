/**
 * Two DOM helpers used by every demo page.
 *
 * Nothing here is framework API: pages receive an `HTMLElement` and a `build` function,
 * and the only thing that differs between hosts is how children get attached.
 */

/** Create an element with an optional class and text. */
export function node(tag: string, className?: string, text?: string): HTMLElement {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

/**
 * Append built content into a host.
 *
 * `mount()` only exists on elements the DOM renderer created. Panel internals are plain
 * `document.createElement` nodes, so they get `appendChild` — same result, no metadata.
 */
export function mountInto(host: HTMLElement, child: unknown): void {
  if (!child) return;
  const element = child instanceof HTMLElement ? child : (child as any).element;
  if (!(element instanceof HTMLElement)) {
    throw new Error(`builder returned ${typeof child}, not an element`);
  }
  if (typeof (host as any).mount === "function") {
    (host as any).mount(element);
  } else {
    host.appendChild(element);
  }
}
