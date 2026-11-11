import type { iPageContent, iPageController, iPageContext } from "@aio-ui/app";
import { navigationMenu } from "../content/shared";

/**
 * Gallery controller — second reference implementation.
 *
 * Masonry already owns its own paging contract (`loadFn(page, category) => items`),
 * so the controller does not fetch everything up front. It fetches page 1, then hands
 * the component a `loadFn` that goes through the same `http` port. The component never
 * learns where the data comes from; swapping the mock for the live backend changes
 * nothing here.
 *
 * The static mock has a single page, so any page past the first resolves to `[]`,
 * which is exactly the signal Masonry already handles as "end of data".
 */
export class GalleryPage implements iPageController {
  async onPrepare({ http, signal }: iPageContext): Promise<iPageContent | void> {
    const first = await http.get({ sheetName: "gallery", page: 1 });

    // A newer navigation already started; drop the result instead of rendering it.
    if (signal.aborted) return;

    const payload = {
      content: first?.data ?? [],
      config: {
        loadFn: async (page: number, category: string | null): Promise<any[]> => {
          const next = await http.get({ sheetName: "gallery", page, category });
          return page === 1 ? (next?.data ?? []) : [];
        },
      },
    };

    return {
      ".page": {
        content: {
          ...navigationMenu,
          // No `builder`: this node is not masonry, it hosts it. The route's plan
          // (`componentRoutes` in the entry) is what preloads the component.
          "main#gallery": {
            onCreated: (el: HTMLElement, _render: any, build: any) => {
              el.mount(build("masonry", payload));
            },
          },
        },
      },
    } as iPageContent;
  }
}
