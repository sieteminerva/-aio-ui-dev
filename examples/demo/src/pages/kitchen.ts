import type { iNodeContent } from "@aio-ui/core/interface";

import { DEMO, DEMO_TIERS, TIER_COST, TIER_LABELS } from "../manifest";
import type { iDemoEntry } from "../manifest";
import { demoNav, pageIntro, tierNav } from "../nav";
import { themeSwitcher } from "../theme-switcher";

/**
 * Kitchen-sink page, generated from the demo table.
 *
 * The table is grouped by teaching tier (basic → intermediate → advanced), so the page
 * reads as a ramp: what a payload alone can build, then what needs config, then what owns
 * state. `category` stays on each card as classification — it is not the order.
 *
 * Each component gets its own card and its own mount call, and a failure is caught
 * **per card**: one broken builder shows a red status line instead of blanking the page.
 * That is still the point of this example — it measures component health, not taste.
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

/** One card: the component's own section id, its labels, and the mount host. */
function cardContentOf(entry: iDemoEntry) {
  return {
    "p.eyebrow": { content: `${entry.category} · ${entry.tier}` },
    "h3": { content: entry.name },
    "p.meta": {
      content: `${entry.kind}${entry.note ? ` · ${entry.note}` : ""}`,
    },
    ".mount": {
      // The host is empty on purpose: the component is mounted into it, and the route
      // names the component in the preload plan — a node never carries a list.
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
  };
}

/** Tier group: eyebrow, title, one "what it costs" line, then the cards in table order. */
function tierSectionOf(tier: (typeof DEMO_TIERS)[number]) {
  const rows = DEMO.filter((entry) => entry.tier === tier);

  return {
    [`section.tier#tier-${tier}`]: {
      attrs: { "data-tier": tier },
      content: {
        "header.tier-head": {
          content: {
            "p.eyebrow": { content: `${tier} tier` },
            "h2": { content: `${TIER_LABELS[tier]} · ${rows.length} komponen` },
            "p.cost": { content: TIER_COST[tier] },
          },
        },
        ".tier-grid": {
          content: Object.fromEntries(
            rows.map((entry) => [`section#${entry.name}`, { content: cardContentOf(entry) }]),
          ),
        },
      },
    },
  };
}

/**
 * Grouped by tier, in tier order. `id-address` has no card of its own on purpose: it only
 * exists as a form field adapter, so it is demonstrated on `#form`.
 */
export function kitchenContent(): iNodeContent {
  return {
    ".page": {
      content: {
        ...demoNav,
        ...pageIntro(
          "Elements",
          `${DEMO.length} komponen elemen · ${DEMO_TIERS.length} tingkat · satu builder, satu node`,
        ),
        ...themeSwitcher,
        "main.kitchen": {
          content: {
            ...tierNav,
            ...Object.assign({}, ...DEMO_TIERS.map((tier) => tierSectionOf(tier))),
          },
        },
      },
    },
  } as unknown as iNodeContent;
}
