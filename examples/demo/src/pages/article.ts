import type { iPageContent, iPageController, iPageContext } from "@aio-ui/app";

import { pageHead, shellPage } from "../shell";
import { stateBlock } from "../states";

type BuildFn = (name: string, data?: any) => HTMLElement;

/**
 * Article page — view composition lives inside `ArticleBuilder`
 * (`controls` → `list` → `aside`, and `list` swaps to `detail` on selection), so the
 * page only supplies data and a config. Component communicates intent via callback/events,
 * not by pushing history directly.
 *
 * The shell paints first and the builder mounts once the data is there, so the loading
 * block is visible instead of the previous route lingering on screen.
 */
async function hydrateArticle(
  host: HTMLElement,
  build: BuildFn,
  http: iPageContext["http"],
  signal: AbortSignal,
  fragment: string,
): Promise<void> {
  host.append(stateBlock("loading", { title: "Memuat artikel…", detail: "GET mock/articles.json" }));

  try {
    const envelope = await http.get({ sheetName: "articles" });

    if (signal.aborted) return;

    const count = Array.isArray(envelope?.data) ? envelope.data.length : 0;

    if (!count) {
      host.replaceChildren(
        stateBlock("empty", {
          title: "Belum ada artikel",
          detail: "Sumber data tidak berisi artikel, jadi kontrol view dan daftar tidak dirender.",
        }),
      );
      return;
    }

    // `host` is a content node, so it carries `mount()` from the DOM renderer.
    host.replaceChildren();
    host.mount(
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
  } catch (error) {
    if (signal.aborted) return;
    host.replaceChildren(
      stateBlock("error", { title: "Artikel gagal dimuat", detail: (error as Error).message }),
    );
  }
}

export class ArticlePage implements iPageController {
  async onPrepare({ http, signal, fragment }: iPageContext): Promise<iPageContent> {
    return shellPage({
      main: {
        ...pageHead("Article", "page component · view controls + list + aside + detail di dalam builder"),
        ".article-host": {
          onCreated: (host: HTMLElement, _render: any, build: BuildFn) => {
            void hydrateArticle(host, build, http, signal, fragment);
          },
        },
      },
    });
  }
}
