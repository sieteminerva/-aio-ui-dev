/**
 * The three tab panels and the sidebar for the `#form` docs route.
 *
 * Same shape as `pages/docs-panels.ts` — sidebar menu, Display / Usage / API — because a docs
 * route should not make a reader learn a second pattern. The difference is the input: a topic
 * (navigation only) instead of a manifest row.
 *
 * **No documentation is written here.** Usage renders the README parts the topic claims; API
 * renders the sections the README marks as its contract, so the two tabs cover one document with
 * no line repeated. Display is the only authored panel, and what it authors is a schema to build.
 */
import { CONTRACT_PARTS, FORM_GROUPS, FORM_TOPICS, topicHref } from "./topics";
import type { iFormTopic } from "./topics";
import { mountInto, node } from "../dom";
import { readmeFor } from "../readme";

type BuildFn = (name: string, data?: any) => HTMLElement;

/**
 * Render README parts with the `markdown` builder — the only sink, never `innerHTML`.
 *
 * The document travels whole and the pointer list decides what shows, so no prose is sliced
 * here. `section: true` gives each part the same rhythm the document had when it was whole.
 */
function renderMarkdown(
  host: HTMLElement,
  build: BuildFn,
  source: string,
  parts: readonly string[],
): void {
  if (!source.trim()) return;
  mountInto(host, build("markdown", { source, outline: { parts: [...parts], section: true } }));
}

/**
 * Display: the topic's schema, built for real, plus the events a form publishes.
 *
 * The log is the point. A schema shows the layout; `formSubmit`, `formValidation` and `search`
 * show the lifecycle, which is the reason the form owns a route of its own.
 */
export function formDisplayPanel(topic: iFormTopic, build: BuildFn): HTMLElement {
  const panel = node("div", "preview-panel");
  const block = node("article", "preview-variant");

  if (!topic.demo) {
    block.dataset.status = "planned";
    block.append(
      node("p", "eyebrow", "No live example yet"),
      node(
        "p",
        "stage-note",
        `This topic is documented in ${topic.source}; its schema is not wired into the demo yet.`,
      ),
    );
    panel.append(block);
    return panel;
  }

  const frame = node("div", "preview-frame");
  block.append(node("p", "eyebrow", topic.demo.note), frame);

  let built: any;
  try {
    built = build("form", { schema: topic.demo.schema, config: topic.demo.config });
    mountInto(frame, built);
    block.dataset.status = "ok";
  } catch (error) {
    block.dataset.status = "error";
    frame.append(node("p", "error", `✖ ${(error as Error).message}`));
    panel.append(block);
    return panel;
  }

  const form: HTMLElement | null = built instanceof HTMLElement ? built : (built?.element ?? null);
  const log = node("pre", "form-log", "Waiting for submit…");

  form?.addEventListener("formSubmit", (event: any) => {
    log.textContent = `formSubmit → ${JSON.stringify(event.detail?.data ?? {}, null, 2)}`;
  });

  form?.addEventListener("formValidation", (event: any) => {
    const { reason, message } = event.detail ?? {};
    if (reason !== "valid") log.textContent = `formValidation (${reason}) → ${message ?? ""}`;
  });

  // A group's `search` action is a read, not a submit: it bubbles up from the fieldset so the
  // page can answer without knowing anything about the controls layer.
  form?.addEventListener("search", (event: any) => {
    log.textContent = `search → ${JSON.stringify(event.detail?.query ?? {}, null, 2)}`;
  });

  block.append(log);
  panel.append(block);
  return panel;
}

/** Usage: the README's lead plus the parts this topic claims. Nothing else. */
export function formUsagePanel(topic: iFormTopic, build: BuildFn): HTMLElement {
  const panel = node("div", "usage-panel");
  const doc = readmeFor(topic.source);

  if (!doc) {
    panel.append(node("p", "error", `No README found for ${topic.source}.`));
    return panel;
  }

  renderMarkdown(panel, build, doc.text, ["@lead", ...topic.parts]);
  return panel;
}

/**
 * API: the contract sections the Usage tab did not claim.
 *
 * Splitting one README across the two tabs is what keeps a topic page from printing the same
 * table twice — and from restating it in a second, hand-maintained copy. A topic that claims
 * `#nodes` (Layout & tokens) simply gets the rest of the contract here.
 */
export function formApiPanel(topic: iFormTopic, build: BuildFn): HTMLElement {
  const panel = node("div", "api-panel");
  const doc = readmeFor(topic.source);
  if (!doc) return panel;

  const parts = CONTRACT_PARTS.filter((part) => !topic.parts.includes(part));
  renderMarkdown(panel, build, doc.text, parts);
  return panel;
}

/**
 * The sidebar: one `menu` with `type: "sidebar"`, grouped by topic group.
 *
 * Brand and group headings are titles, not destinations — `onNavigate` swallows them, the same
 * way `#kitchen` swallows its tier headings. A topic row carries the fragment.
 */
export function mountFormSidebar(host: HTMLElement, build: BuildFn, activeId: string): void {
  const navigations: Record<string, string>[] = [{ label: "Form docs", href: "#form" }];

  for (const group of FORM_GROUPS) {
    const rows = FORM_TOPICS.filter((topic) => topic.group === group);
    if (!rows.length) continue;

    navigations.push({ label: group, href: "#form", className: "group" });
    for (const topic of rows) {
      navigations.push({
        label: topic.label,
        href: topicHref(topic),
        ...(topic.id === activeId ? { className: "is-active" } : {}),
      });
    }
  }

  mountInto(
    host,
    build("menu", {
      content: { navigations },
      config: {
        type: "sidebar",
        // `form` is the brand and the four group headings: not destinations.
        onNavigate: (href?: string) => href === "form",
      },
    }),
  );
}
