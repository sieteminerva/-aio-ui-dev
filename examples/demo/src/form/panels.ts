/**
 * The three tab panels and the sidebar for the `#form` docs route.
 *
 * Same shape as `pages/docs-panels.ts` — sidebar menu, Display / Usage / API — because a docs
 * route should not make a reader learn a second pattern. The difference is the input: a topic
 * (navigation only) instead of a manifest row.
 *
 * **No documentation is written here.** Usage renders the README sections the topic claims;
 * API renders the contract sections it does not claim, so the two tabs cover one README with no
 * line repeated. Display is the only authored panel, and what it authors is a schema to build.
 */
import { FORM_GROUPS, FORM_TOPICS, topicHref } from "./topics";
import type { iFormTopic } from "./topics";
import { mountInto, node } from "../dom";
import { readmeFor, sectionOf } from "../readme";

type BuildFn = (name: string, data?: any) => HTMLElement;

/** The contract sections, in the order the API tab renders them. */
const API_SECTIONS = ["Config", "Nodes", "Tokens", "Wiring checklist"] as const;

/** One README section as Markdown, heading included; `null` when the README lacks it. */
function sectionMarkdown(source: string, heading: string): string | null {
  const doc = readmeFor(source);
  if (!doc) return null;
  const section = sectionOf(doc, heading);
  return section ? `## ${section.heading}\n\n${section.body}`.trim() : null;
}

/** Render Markdown with the `markdown` builder — the only sink, never `innerHTML`. */
function renderMarkdown(host: HTMLElement, build: BuildFn, source: string): void {
  if (!source.trim()) return;
  mountInto(host, build("markdown", { source }));
}

/**
 * The first sentence of the README lead — the one-line description the tab header shows.
 *
 * Taken from the document rather than written beside it: a package that renames itself must not
 * leave a stale sentence on the page.
 */
export function leadOf(source: string): string {
  const lead = readmeFor(source)?.lead ?? "";
  const first = lead.split(/(?<=[.!?])\s/)[0]?.trim();
  return first || "";
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

/** Usage: the README's lead plus the sections this topic claims. Nothing else. */
export function formUsagePanel(topic: iFormTopic, build: BuildFn): HTMLElement {
  const panel = node("div", "usage-panel");
  const doc = readmeFor(topic.source);

  if (!doc) {
    panel.append(node("p", "error", `No README found for ${topic.source}.`));
    return panel;
  }

  const blocks = [
    doc.lead,
    ...topic.sections.map((heading) => sectionMarkdown(topic.source, heading)),
  ].filter((block): block is string => Boolean(block));

  renderMarkdown(panel, build, blocks.length ? blocks.join("\n\n") : doc.text);
  return panel;
}

/**
 * API: the contract sections the Usage tab did not claim.
 *
 * Splitting one README across the two tabs is what keeps a topic page from printing the same
 * table twice — and from restating it in a second, hand-maintained copy.
 */
export function formApiPanel(topic: iFormTopic, build: BuildFn): HTMLElement {
  const panel = node("div", "api-panel");
  const doc = readmeFor(topic.source);
  if (!doc) return panel;

  const blocks = API_SECTIONS.filter((heading) => !topic.sections.includes(heading))
    .map((heading) => sectionMarkdown(topic.source, heading))
    .filter((block): block is string => Boolean(block));

  renderMarkdown(panel, build, blocks.length ? blocks.join("\n\n") : doc.text);
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
