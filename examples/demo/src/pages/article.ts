import type { iPageContent, iPageController, iPageContext } from "@aio-ui/app";

import { demoNav, pageIntro } from "../nav";

/**
 * Article page — the slot composition lives inside `ArticleBuilder`
 * (`controls` → `list` → `aside`, and `list` swaps to `detail` on selection), so the
 * page only supplies data and a config. That is the difference the demo is meant to
 * show: product composes at the page level, article composes inside its builder.
 */
export class ArticlePage implements iPageController {
  async onPrepare({ http, signal }: iPageContext): Promise<iPageContent | void> {
    const envelope = await http.get({ sheetName: "articles" });

    if (signal.aborted) return;

    const count = Array.isArray(envelope?.data) ? envelope.data.length : 0;

    return {
      ".page": {
        content: {
          ...demoNav,
          ...pageIntro("Article", `${count} artikel · slot controls + list + aside + detail di dalam builder`),
          "main.article-page": {
            content: {
              ".article-host": {
                builder: ["article"],
                onCreated: (el: HTMLElement, _render: any, build: any) => {
                  el.mount(
                    build("article", {
                      // The builder reads `content?.content || content`, so the API
                      // envelope goes in as the schema and `meta.links` drives pagination.
                      schema: envelope,
                      config: { view: "card", recommendation: true, items: 3 },
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
