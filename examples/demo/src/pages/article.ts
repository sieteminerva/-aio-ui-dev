import type { iPageContent, iPageController, iPageContext } from "@aio-ui/app";

import { demoNav, pageIntro } from "../nav";
import { themeSwitcher } from "../theme-switcher";

/**
 * Article page — view composition lives inside `ArticleBuilder`
 * (`controls` → `list` → `aside`, and `list` swaps to `detail` on selection), so the
 * page only supplies data and a config. Component communicates intent via callback/events,
 * not by pushing history directly.
 */
export class ArticlePage implements iPageController {
  async onPrepare({ http, signal, fragment }: iPageContext): Promise<iPageContent | void> {
    const envelope = await http.get({ sheetName: "articles" });

    if (signal.aborted) return;

    const count = Array.isArray(envelope?.data) ? envelope.data.length : 0;

    return {
      ".page": {
        content: {
          ...demoNav,
          ...pageIntro("Article", `${count} artikel · view controls + list + aside + detail di dalam builder`),
          ...themeSwitcher,
          "main.article-page": {
            content: {
              ".article-host": {
                onCreated: (el: HTMLElement, _render: any, build: any) => {
                  el.mount(
                    build("article", {
                      // The builder reads `content?.content || content`, so the API
                      // envelope goes in as the schema and `meta.links` drives pagination.
                      schema: envelope,
                      config: {
                        view: "card",
                        recommendation: true,
                        items: 3,
                        // `#article/<slug>` is the host's URL. The page reads the fragment and
                        // tells the component which record to open on first paint; the component
                        // never parses the hash itself.
                        initialSlug: fragment,
                        initialView: fragment ? "detail" : "list",
                        navigate: (slug: string) => {
                          const base = "#article";
                          if (slug) {
                            location.hash = `${base}/${slug}`;
                          } else {
                            location.hash = base;
                          }
                        },
                      },
                    }),
                  );
                },
              },
            },
          },
        },
      },
    } as iPageContent;
  }
}
