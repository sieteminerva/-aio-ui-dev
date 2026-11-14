import { describe, expect, it } from "vitest";

import {
  CONTRACT_PARTS,
  FORM_GROUPS,
  FORM_TOPICS,
  OVERVIEW_ID,
  topicForFragment,
  topicHref,
} from "../form/topics";
import { readmeFor, sectionOf, subsectionOf } from "../readme";

/**
 * The `#form` docs tree is navigation, so it is checkable without a browser — and the checks
 * are exactly the silent failures a README-driven page can have:
 *
 * - a topic whose `source` has no README renders an error box instead of documentation;
 * - a topic citing a pointer the README never declares renders nothing, and nobody notices
 *   the topic lost its focus — `config.outline` skips an unresolved path by design;
 * - a topic in an unknown group never appears in the sidebar at all;
 * - two topics claiming the same part would print one paragraph twice.
 */

/** The `id → role` map a README declares with its `<!-- part: … -->` lines. */
function markerRoles(text: string): Map<string, string> {
  const roles = new Map<string, string>();

  for (const line of text.split("\n")) {
    const marker = /^\s*<!--\s*part:\s*(.*?)\s*-->\s*$/.exec(line);
    if (!marker) continue;

    const id = /(?:^|\s)id=([\w-]+)/.exec(marker[1])?.[1];
    if (id) roles.set(id, /(?:^|\s)role=([\w-]+)/.exec(marker[1])?.[1] ?? "");
  }

  return roles;
}

describe("form docs topics", () => {
  it("declares the hub plus nine topics, with unique ids", () => {
    expect(OVERVIEW_ID).toBe("overview");
    expect(FORM_TOPICS).toHaveLength(10);

    const ids = FORM_TOPICS.map((topic) => topic.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids[0]).toBe(OVERVIEW_ID);
  });

  it("only uses groups the sidebar renders", () => {
    for (const topic of FORM_TOPICS) {
      expect(FORM_GROUPS).toContain(topic.group);
    }

    // Every declared group must own at least one topic, or the heading renders empty.
    for (const group of FORM_GROUPS) {
      expect(FORM_TOPICS.some((topic) => topic.group === group)).toBe(true);
    }
  });

  it("reads a README that really exists", () => {
    for (const topic of FORM_TOPICS) {
      expect(readmeFor(topic.source), `${topic.id} → ${topic.source}`).not.toBeNull();
    }
  });

  it("claims a pointer its README really declares", () => {
    for (const topic of FORM_TOPICS) {
      const doc = readmeFor(topic.source)!;
      const declared = markerRoles(doc.text);

      expect(topic.parts.length, `${topic.id} claims no part`).toBeGreaterThan(0);
      for (const part of topic.parts) {
        // Heading text is not a part any more: a rename must not silently empty a tab.
        expect(part.startsWith("#"), `${topic.id} → ${part} is not an anchor`).toBe(true);
        expect(declared.has(part.slice(1)), `${topic.id} → ${topic.source} ${part}`).toBe(true);
      }
    }
  });

  it("splits one shared README section per feature", () => {
    // `Supported syntax` documents all four engines; each topic must get its own block, or the
    // page would render the same four examples under three different headings.
    const doc = readmeFor("@aio-ui/form")!;
    const section = sectionOf(doc, "Supported syntax")!;

    const cascade = subsectionOf(section, "Cascade")!;
    expect(cascade).toContain("cascadeMode");
    expect(cascade).not.toContain("multistep");

    const multistep = subsectionOf(section, "Multistep")!;
    expect(multistep).toContain("multistep: true");
    expect(multistep).not.toContain("cascadeMode");
  });

  it("leaves the API tab something to render", () => {
    for (const topic of FORM_TOPICS) {
      const doc = readmeFor(topic.source)!;
      const declared = markerRoles(doc.text);

      // Every README marks the four contract sections, so the demo's list is derived, not copied.
      for (const part of CONTRACT_PARTS) {
        expect(declared.get(part.slice(1)), `${topic.source} ${part}`).toBe("contract");
      }

      // A claimed section is subtracted, so no paragraph is printed in both tabs.
      const api = CONTRACT_PARTS.filter((part) => !topic.parts.includes(part));
      expect(api.length, `${topic.id} claims every contract section`).toBeGreaterThan(0);
    }
  });

  it("only declares a demo when it has a schema to build", () => {
    for (const topic of FORM_TOPICS) {
      if (!topic.demo) continue;
      expect(topic.demo.schema.length, topic.id).toBeGreaterThan(0);
      expect(topic.demo.note.trim().length, topic.id).toBeGreaterThan(0);
      expect(typeof topic.demo.config, topic.id).toBe("object");
    }
  });
});

describe("topicForFragment", () => {
  it("falls back to the overview for an empty or unknown fragment", () => {
    expect(topicForFragment("").id).toBe(OVERVIEW_ID);
    expect(topicForFragment(undefined).id).toBe(OVERVIEW_ID);
    expect(topicForFragment("does-not-exist").id).toBe(OVERVIEW_ID);
  });

  it("reads a topic name out of the fragment, case-insensitively", () => {
    expect(topicForFragment("fields").id).toBe("fields");
    expect(topicForFragment("Validation").id).toBe("validation");
  });

  it("links every topic at its own fragment, overview included", () => {
    // The brand and the group headings point at `#form` and the sidebar swallows those
    // clicks, so no row may reuse the bare route.
    for (const topic of FORM_TOPICS) expect(topicHref(topic)).toBe(`#form/${topic.id}`);
  });
});
