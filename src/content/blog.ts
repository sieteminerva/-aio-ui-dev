import type { iNodeContent } from "../lib/interface";
import { navigationMenu } from "./shared";
import ARTICLE_RESPONSE from "./blog.json";

export const BlogContent: iNodeContent = {
  "#app": {
    content: {
      ...navigationMenu,
      "main#blog": {
        onCreated: (el: HTMLElement, _renderFn: any, builderFn: any) => {
          el.mount(builderFn("article", ARTICLE_RESPONSE));
        }
      }
    }
  }
};