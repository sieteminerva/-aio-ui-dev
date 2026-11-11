import type { iPageContent, iPageController, iPageContext } from "@aio-ui/app";
import { navigationMenu } from "../content/shared";

/**
 * Reference page controller.
 *
 * It demonstrates the three things a controller is allowed to do, and nothing else:
 *
 * 1. load data through `ctx.http` — never `fetch`, never a JSON import, so the mock
 *    and the live backend behave identically;
 * 2. return the page tree to render;
 * 3. stay cancellable: `ctx.signal` fires when the visitor navigates away mid-request.
 *
 * The route owns no content in `source.pages`, which is exactly why the entry accepts
 * a controller as the page source.
 */
export class BlogPage implements iPageController {
  async onPrepare({ http, signal }: iPageContext): Promise<iPageContent | void> {
    const article = await http.get({ sheetName: "blog" });

    // A newer navigation already started; drop the result instead of rendering it.
    if (signal.aborted) return;

    return {
      ".page": {
        content: {
          ...navigationMenu,
          // No `builder`: this node is not the article, it hosts it. The route's plan
          // (`componentRoutes` in the entry) is what preloads the component.
          "main#blog": {
            onCreated: (el: HTMLElement, _render: any, build: any) => {
              el.mount(build("article", article));
            },
          },
        },
      },
    } as iPageContent;
  }
}
