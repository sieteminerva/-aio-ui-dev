import type { iPageContent, iPageController, iPageContext, iPageReadyContext } from "@aio-ui/app";
import { releaseBuilders } from "@aio-ui/core";

import { mountInto } from "../dom";
import { formApiPanel, formDisplayPanel, formUsagePanel, mountFormSidebar } from "../form/panels";
import { topicForFragment } from "../form/topics";
import type { iFormTopic } from "../form/topics";
import { leadSentence, readmeFor } from "../readme";
import { shellPage } from "../shell";

type BuildFn = (name: string, data?: any) => HTMLElement;

/**
 * `#form` — the form family docs route.
 *
 *   aside   one menu, `type: "sidebar"`, grouped: Schema · Behaviour · Inputs · Wiring
 *   main    tab builder: Display · Usage · API for the selected topic
 *
 * The form is a *subsystem*, not a catalogue entry: a schema contract, five adapters and three
 * sibling packages. That is why it owns a route with its own topic tree (`form/topics.ts`)
 * instead of a row in the element manifest — and why it borrows the element route's layout
 * rather than its data source.
 *
 * The topic travels in the fragment (`#form/<topic>`), so refresh and deep links work without
 * a new API: the router already splits `#route/fragment`, and this page reads it. Because every
 * topic is a fragment of one route, switching topics re-creates the controller — hence the
 * shell handle and the `releaseBuilders` sweep on the way out.
 */

/** Main column: one tab, three panels. Panels are elements, so the tab renders them lazily. */
function mountMain(host: HTMLElement, topic: iFormTopic, build: BuildFn): void {
  mountInto(
    host,
    build("tab", {
      content: {
        menu: [{ label: "Display" }, { label: "Usage" }, { label: "API" }],
        body: [
          {
            id: "panel-display",
            content: {
              eyebrow: `Form · ${topic.group}`,
              title: topic.label,
              // The description is the README's own opening sentence, not a second copy.
              description: leadSentence(readmeFor(topic.source)),
            },
          },
          { id: "panel-usage", content: formUsagePanel(topic, build) },
          { id: "panel-api", content: formApiPanel(topic, build) },
        ],
      },
      config: { menuPosition: "top" },
    }),
  );

  // The live demo is filled after the tab exists: the Display panel is the first one shown,
  // and its host has to be in the document before a form mounts inside it.
  const panel = host.querySelector<HTMLElement>("#panel-display");
  if (panel) panel.append(formDisplayPanel(topic, build));
}

function formRouteContent(topic: iFormTopic): iPageContent {
  return shellPage({
    aside: {
      onCreated: (element: HTMLElement, _render: any, build: BuildFn) =>
        mountFormSidebar(element, build, topic.id),
    },
    main: {
      onCreated: (element: HTMLElement, _render: any, build: BuildFn) =>
        mountMain(element, topic, build),
    },
  });
}

/**
 * The route controller.
 *
 * It keeps the shell it rendered so `onDestroy` can hand it to `releaseBuilders`: a form
 * builds adapters and picks up address listeners, and a topic switch must not leave them
 * alive behind the new page.
 */
export class FormPage implements iPageController {
  #shell: HTMLElement | null = null;

  async onPrepare({ fragment }: iPageContext): Promise<iPageContent | void> {
    return formRouteContent(topicForFragment(fragment));
  }

  onReady({ shell }: iPageReadyContext): void {
    this.#shell = shell;
  }

  onDestroy(): void {
    if (this.#shell) releaseBuilders(this.#shell);
    this.#shell = null;
  }
}
