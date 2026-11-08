import type { iNodeContent } from "@aio-ui/core/interface";

import { DEMO } from "../manifest";
import type { iDemoEntry } from "../manifest";
import { demoNav, pageIntro } from "../nav";
import { themeSwitcher } from "../theme-switcher";

/**
 * Kitchen-sink page, generated from the demo table.
 *
 * Each component gets its own `section#<name>` and its own mount call, and a failure is
 * caught **per section**: one broken builder shows a red status line instead of blanking
 * the page. That is the whole point of this example — it measures component health, not
 * visual taste.
 */
function mount(host: HTMLElement, entry: iDemoEntry, build: any): void {
  try {
    const out = build(entry.name, entry.payload);

    if (out instanceof HTMLElement) {
      host.mount(out);
    } else if (out?.element instanceof HTMLElement) {
      host.mount(out.element);
    } else {
      throw new Error(`builder returned ${typeof out}, not an element`);
    }

    host.dataset.status = "ok";
  } catch (error) {
    host.dataset.status = "error";
    host.dataset.error = (error as Error).message;
    const message = document.createElement("p");
    message.className = "error";
    message.textContent = `✖ ${(error as Error).message}`;
    host.appendChild(message);
  }
}

/** One section per table row, in table order. */
export function kitchenContent(): iNodeContent {
  const sections = DEMO.map((entry) => ({
    [`section#${entry.name}`]: {
      content: {
        "h2": { content: entry.name },
        "p.meta": {
          content: `${entry.category} · ${entry.kind}${entry.note ? ` · ${entry.note}` : ""}`,
        },
        ".mount": {
          // Declaration, not decoration: a node carrying `builder` has its content
          // consumed by the builder, so the declaration lives on this empty host — not
          // on the section, which must keep its heading.
          builder: [entry.name],
          onCreated: (element: HTMLElement, _render: any, build: any) => mount(element, entry, build),
        },
        ...(entry.kind === "modal"
          ? {
            "button.open": {
              content: "open modal",
              onCreated: (element: HTMLElement) =>
                element.addEventListener("click", () => (globalThis as any).__demoModal?.open?.()),
            },
          }
          : {}),
      },
    },
  }));

  return {
    ".page": {
      content: {
        ...demoNav,
        ...pageIntro("Elements", `${DEMO.length} komponen elemen · satu builder, satu node`),
        ...themeSwitcher,
        "main.kitchen": { content: sections },
      },
    },
  } as unknown as iNodeContent;
}
