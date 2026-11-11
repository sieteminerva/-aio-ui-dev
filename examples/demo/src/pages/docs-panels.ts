/**
 * The three tab panels and the sidebar, assembled from builders.
 *
 * Placement only: every string comes from `docs.ts`, every component from the registry via
 * `build`. Nothing here decides how it looks — that is phase 3, and it stays in `style.css`.
 *
 * Panels are plain elements on purpose: the tab builder appends an `HTMLElement` item
 * as-is (see `TabBuilder._renderPanelContent`), which is the only way to put a real mounted
 * component and a real table inside a panel.
 */
import { apiOf, entryHash, tierGroups, usageOf, variantsOf } from "../docs";
import type { iDemoEntry } from "../manifest";

type BuildFn = (name: string, data?: any) => HTMLElement;

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

function node(tag: string, className?: string, text?: string): HTMLElement {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

/** `path`, `stylesheet`, `builder` … as a definition list, one pair per fact. */
function factList(fields: { label: string; value: string }[]): HTMLElement {
  const list = node("dl", "facts");
  for (const field of fields) {
    list.append(node("dt", undefined, field.label), node("dd", undefined, field.value));
  }
  return list;
}

/** Display: every declared variant, built for real. A failure is shown, never thrown. */
export function previewPanel(entry: iDemoEntry, build: BuildFn): HTMLElement {
  const panel = node("div", "preview-panel");

  for (const variant of variantsOf(entry)) {
    const block = node("article", "preview-variant");
    const frame = node("div", "preview-frame");

    try {
      mountInto(frame, build(entry.name, variant.payload));
      block.dataset.status = "ok";
    } catch (error) {
      block.dataset.status = "error";
      frame.append(node("p", "error", `✖ ${(error as Error).message}`));
    }

    block.append(node("p", "eyebrow", variant.label), frame);
    panel.append(block);
  }

  return panel;
}

/** Cara Penggunaan: one summary line, the four facts, the snippet, then the limits. */
export function usagePanel(entry: iDemoEntry): HTMLElement {
  const view = usageOf(entry);
  const panel = node("div", "usage-panel");

  panel.append(node("p", "summary", view.summary), factList(view.fields));
  panel.append(node("pre", "snippet", view.snippet));

  if (view.limits.length) {
    const limits = node("ul", "limits");
    for (const limit of view.limits) limits.append(node("li", undefined, limit));
    panel.append(limits);
  }

  return panel;
}

/** API: the table row plus every config key with the value this demo really passes. */
export function apiPanel(entry: iDemoEntry): HTMLElement {
  const view = apiOf(entry);
  const panel = node("div", "api-panel");

  const rows = node("table", "api-rows");
  for (const row of view.rows) {
    const line = node("tr");
    line.append(node("th", undefined, row.label), node("td", undefined, row.value));
    rows.append(line);
  }
  panel.append(rows);

  if (view.config.length) {
    const config = node("table", "api-config");
    const head = node("tr");
    head.append(node("th", undefined, "key"), node("th", undefined, "type"), node("th", undefined, "nilai"));
    config.append(head);
    for (const row of view.config) {
      const line = node("tr");
      line.append(node("td", undefined, row.key), node("td", undefined, row.type), node("td", undefined, row.example));
      config.append(line);
    }
    panel.append(node("h4", undefined, "config"), config);
  }

  return panel;
}

/**
 * One sidebar `menu` per tier.
 *
 * `splitMenuContent` treats the first navigation as the brand, so the brand *is* the tier
 * heading — that is why a tier is one menu and not a label plus a list. The brand click is
 * swallowed in `onNavigate`; every other link is a real `#kitchen/<name>` route.
 */
export function mountSidebars(host: HTMLElement, build: BuildFn, activeName: string): void {
  for (const group of tierGroups()) {
    const brandRoute = `kitchen/${group.tier}`;

    const menu = build("menu", {
      content: {
        navigations: [
          { label: group.label, href: `#${brandRoute}` },
          ...group.rows.map((row) => ({
            label: row.name,
            href: entryHash(row.name),
            ...(row.name === activeName ? { className: "is-active" } : {}),
          })),
        ],
      },
      config: {
        type: "sidebar",
        // `menu` asks the host first; the tier label is a heading, not a destination.
        onNavigate: (href?: string) => href === brandRoute,
      },
    });

    mountInto(host, menu);
  }
}