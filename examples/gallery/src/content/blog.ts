import type { iNodeContent } from "@aio-ui/core/interface";
import { navigationMenu } from "./shared";
import ARTICLE_RESPONSE from "./blog.json";

export const BlogContent: iNodeContent = {
  "#app": {
    content: {
      ...navigationMenu,
      "main#blog": {
        // Mounted inside onCreated; `builder` is reserved and never rendered.
        builder: ["article"],
        onCreated: (el: HTMLElement, _renderFn: any, builderFn: any) => {
          el.mount(builderFn("article", ARTICLE_RESPONSE));
        }
      }
    }
  }
};