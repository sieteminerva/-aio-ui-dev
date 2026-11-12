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
import { mountInto, node } from "../dom";
import type { iDemoEntry } from "../manifest";

type BuildFn = (name: string, data?: any) => HTMLElement;

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
    const note = node("p", "stage-note");
    // Assembled up front so `stage()` can fill the note from anywhere, and a frame that
    // fails later still appears in its final position.
    block.append(node("p", "eyebrow", variant.label), frame, note);
    let opener: HTMLElement | null = null;

    try {
      const built = build(entry.name, variant.payload);
      mountInto(frame, built);
      block.dataset.status = "ok";

      // A component that positions itself out of flow (`fab`) or renders nothing until it
      // is opened (`modal`) has no height of its own, so a frame sized by content would be
      // an empty strip. The table says which rows those are (`stage`) — nothing is measured
      // here, because computed style on a detached panel is meaningless.
      if (entry.stage) {
        frame.classList.add("is-stage");
        note.textContent =
          entry.kind === "modal"
            ? "dialog tampil sebagai overlay di dalam frame ini begitu dibuka"
            : "komponen memosisikan dirinya sendiri; frame ini menjadi containing block";
      }

      // A modal renders nothing until it is opened, so the display would show an empty
      // frame. `build()` hands back the element here, while the control handle arrives
      // through the builder's `onReady` config — so the opener accepts either one.
      if (entry.kind === "modal") {
        const controls = built as any;
        const button = node("button", "open-modal", "open modal") as HTMLButtonElement;
        button.type = "button";
        button.addEventListener("click", () => {
          const handle = typeof controls?.open === "function" ? controls : (globalThis as any).__demoModal;
          handle?.open?.();
        });
        opener = button;
      }
    } catch (error) {
      block.dataset.status = "error";
      frame.append(node("p", "error", `✖ ${(error as Error).message}`));
    }

    if (opener) block.append(opener);
    panel.append(block);
  }

  return panel;
}

/** Cara Penggunaan: one summary line, the four facts, the snippet, then the limits. */
export function usagePanel(entry: iDemoEntry, build: BuildFn): HTMLElement {
  const view = usageOf(entry);
  const panel = node("div", "usage-panel");

  panel.append(node("p", "summary", view.summary), factList(view.fields));
  // The snippet is the real `code-block` component, not a hand-rolled `<pre>`: the demo
  // shows the framework by using it, and its look lives in the package, not in demo CSS.
  mountInto(panel, build("code-block", { code: view.snippet }));

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
 * The one sidebar.
 *
 * One `menu` with `type: "sidebar"` — the loop belongs inside the list
 * (`aside > .navigations > .item`), not around the aside: three menus would nest three
 * `<aside class="sidebar">` and repeat `id="primary-navigations"` three times.
 *
 * `splitMenuContent` treats the first navigation as the brand, so the brand is the sidebar
 * title. Tier labels are plain items marked `.group`: they are headings inside the list, so
 * they are not a second component, and `onNavigate` swallows their click.
 */
export function mountSidebar(host: HTMLElement, build: BuildFn, activeName: string): void {
  const navigations: Record<string, string>[] = [{ label: "Components", href: "#kitchen" }];

  for (const group of tierGroups()) {
    navigations.push({ label: group.label, href: "#kitchen", className: "group" });
    for (const row of group.rows) {
      navigations.push({
        label: row.name,
        href: entryHash(row.name),
        className: `tier-${group.tier}${row.name === activeName ? " is-active" : ""}`,
      });
    }
  }

  mountInto(
    host,
    build("menu", {
      content: { navigations },
      config: {
        type: "sidebar",
        // `#kitchen` is the brand and the tier headings, not a destination to jump to.
        onNavigate: (href?: string) => href === "kitchen",
      },
    }),
  );
}