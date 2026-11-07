import type { iNodeContent } from "@aio-ui/core/interface";
import { navigationMenu } from "./shared";
import ARTICLE_RESPONSE from "./blog.json";

export const BlogContent: iNodeContent = {
  "#app": {
    content: {
      ...navigationMenu,
      "main#blog": {
        // Built inside onCreated, so the tree cannot reveal it.
        options: { requires: ["article"] },
        onCreated: (el: HTMLElement, _renderFn: any, builderFn: any) => {
          el.mount(builderFn("article", ARTICLE_RESPONSE));
        }
      }
    }
  }
};