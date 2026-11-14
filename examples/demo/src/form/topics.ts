/**
 * Navigation for the `#form` docs tree — not documentation.
 *
 * The convention this file obeys: a component's `README.md` *is* the documentation, the demo
 * renders it through the `markdown` builder, and only the Display tab is authored here. So a
 * topic declares two things and nothing else:
 *
 * 1. **which package README it reads** (`source`);
 * 2. **which parts of it it claims** (`parts`) — the Usage tab renders exactly those, and the
 *    API tab renders the contract sections (`role:contract`), so the two tabs cover one document
 *    without repeating a single line.
 *
 * A part is a **pointer**, not a heading: the README declares `<!-- part: id=validation -->` on
 * the line above `### Validation`, and the topic cites `#validation`. Rename the heading, edit
 * the README — never this file.
 *
 * What remains authored is the demo (Display tab) and the sidebar label. Nothing that could
 * be taken from a README is written here; if a topic needs prose that does not exist yet, the
 * README is the place to add it.
 */
import {
  DropdownSet,
  InputControlSet,
  fieldTypesSchema,
  formConfig,
  multiStepConfig,
  multiStepSchema,
  orderSchema,
  validationSchema,
} from "./schema";

export type iFormTopicGroup = "Schema" | "Behaviour" | "Inputs" | "Wiring";

/** The sidebar order. A group is a heading inside the list, never a second component. */
export const FORM_GROUPS: readonly iFormTopicGroup[] = [
  "Schema",
  "Behaviour",
  "Inputs",
  "Wiring",
];

/** One live example: the only hand-authored content a topic may carry. */
export interface iFormTopicDemo {
  /** Caption under the frame — a label, not documentation. */
  note: string;
  schema: unknown[];
  config: Record<string, unknown>;
}

export interface iFormTopic {
  /** Fragment value: `#form/<id>`. */
  id: string;
  /** Sidebar row. */
  label: string;
  group: iFormTopicGroup;
  /** Package whose README documents this topic. */
  source: string;
  /**
   * Outline parts the Usage tab renders, in order — `markdown`'s `config.outline.parts`.
   *
   * A part is an anchor (`#validation`) or the document's lead (`@lead`), and it brings the
   * sections nested under it with it. Nothing here is a heading text: the README owns the
   * wording, the pointer owns the identity.
   */
  parts: readonly string[];
  /** Live example; `null` while the schema is not wired yet. */
  demo: iFormTopicDemo | null;
}

/** The hub. The bare route `#form` shows it too. */
export const OVERVIEW_ID = "overview";

/**
 * The contract sections, in the order the API tab renders them.
 *
 * Every package README declares these four pointers with `role=contract`, so the list is not a
 * second copy of the prose — the topic test fails if a README stops marking one.
 */
export const CONTRACT_PARTS = ["#config", "#nodes", "#tokens", "#wiring"] as const;

export const FORM_TOPICS: readonly iFormTopic[] = [
  {
    id: OVERVIEW_ID,
    label: "Overview",
    group: "Schema",
    source: "@aio-ui/form",
    parts: ["#payload"],
    demo: {
      note: "one schema: actions, rows, cascade, files and dropdowns",
      schema: orderSchema,
      config: formConfig,
    },
  },
  {
    id: "fields",
    label: "Field types",
    group: "Schema",
    source: "@aio-ui/input",
    parts: ["#payload"],
    demo: {
      note: "every editable field type, grouped: text & number · choice · other values",
      schema: fieldTypesSchema,
      config: { id: "demo-field-types" },
    },
  },
  {
    id: "layout",
    label: "Layout & tokens",
    group: "Schema",
    source: "@aio-ui/form",
    parts: ["#nodes", "#tokens"],
    demo: null,
  },
  {
    id: "validation",
    label: "Validation",
    group: "Behaviour",
    source: "@aio-ui/form",
    parts: ["#validation"],
    demo: {
      note: "required, pattern and a number range — submit to see the message",
      schema: validationSchema,
      config: { id: "demo-validation" },
    },
  },
  {
    id: "cascade",
    label: "Cascade",
    group: "Behaviour",
    source: "@aio-ui/form",
    parts: ["#cascade"],
    demo: null,
  },
  {
    id: "calculation",
    label: "Calculation",
    group: "Behaviour",
    source: "@aio-ui/form",
    parts: ["#calculation"],
    demo: null,
  },
  {
    id: "multistep",
    label: "Multistep",
    group: "Behaviour",
    source: "@aio-ui/form",
    parts: ["#multistep"],
    // Kept live because the old single-column `#form` page built it: splitting the page must
    // not drop a demo that already existed.
    demo: {
      note: "three groups become three steps — try next without filling the required field",
      schema: multiStepSchema,
      config: multiStepConfig,
    },
  },
  {
    id: "input",
    label: "Input controls",
    group: "Inputs",
    source: "@aio-ui/input",
    parts: ["#payload"],
    demo: {
      note: "per-field actions, then the two dropdown modes",
      schema: [InputControlSet, DropdownSet],
      config: { id: "demo-input-controls" },
    },
  },
  {
    id: "id-address",
    label: "Id Address",
    group: "Inputs",
    source: "@aio-ui/id-address",
    parts: ["#payload"],
    demo: null,
  },
  {
    id: "modules",
    label: "Modules & adapters",
    group: "Wiring",
    source: "@aio-ui/form",
    // `role:contract` is the API tab, so a topic never claims a contract section: the checklist
    // renders once, under API, for every topic.
    parts: ["#register"],
    demo: null,
  },
];

/** The topic a fragment names; an unknown fragment falls back to the overview. */
export function topicForFragment(fragment?: string | null): iFormTopic {
  const wanted = (fragment ?? "").trim().toLowerCase();
  if (!wanted) return FORM_TOPICS[0];
  return FORM_TOPICS.find((topic) => topic.id === wanted) ?? FORM_TOPICS[0];
}

/**
 * The hash a sidebar row points at.
 *
 * Always the explicit fragment, including the overview (`#form/overview`): the brand and the
 * group headings also point at `#form`, and the sidebar swallows every click on `#form` — a
 * row with that href would be a dead link.
 */
export function topicHref(topic: iFormTopic): string {
  return `#form/${topic.id}`;
}
