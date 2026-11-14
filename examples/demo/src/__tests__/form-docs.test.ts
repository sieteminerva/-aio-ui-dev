import { describe, expect, it } from "vitest";

import {
  FORM_GROUPS,
  FORM_TOPICS,
  OVERVIEW_ID,
  sectionHeading,
  subsectionHeading,
  topicForFragment,
  topicHref,
} from "../form/topics";
import { readmeFor, sectionOf, subsectionOf } from "../readme";

/**
 * The `#form` docs tree is navigation, so it is checkable without a browser — and the checks
 * are exactly the silent failures a README-driven page can have:
 *
 * - a topic whose `source` has no README renders an error box instead of documentation;
 * - a topic claiming a heading the README does not have silently falls back to rendering the
 *   whole README (or nothing), and nobody notices the topic lost its focus;
 * - a topic in an unknown group never appears in the sidebar at all;
 * - two topics claiming every contract section would leave the API tab empty.
 */
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

  it("claims only section headings its README really has", () => {
    for (const topic of FORM_TOPICS) {
      const doc = readmeFor(topic.source)!;

      expect(topic.sections.length, `${topic.id} claims no section`).toBeGreaterThan(0);
      for (const path of topic.sections) {
        const heading = sectionHeading(path);
        const section = sectionOf(doc, heading);
        expect(section, `${topic.id} → ${topic.source} #${heading}`).not.toBeNull();

        const sub = subsectionHeading(path);
        if (sub) {
          expect(
            subsectionOf(section!, sub),
            `${topic.id} → ${topic.source} #${heading} > ${sub}`,
          ).not.toBeNull();
        }
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
    const contract = ["Config", "Nodes", "Tokens", "Wiring checklist"];

    for (const topic of FORM_TOPICS) {
      const claimed = topic.sections.map((path) => sectionHeading(path).toLowerCase());
      const remaining = contract.filter((heading) => !claimed.includes(heading.toLowerCase()));
      expect(remaining.length, `${topic.id} claims every contract section`).toBeGreaterThan(0);
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
