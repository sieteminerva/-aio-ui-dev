import type { iNodeContent } from "@aio-ui/core/interface";
import { navigationMenu } from "./shared";
import GALLERY_RESPONSE from "./gallery.json";
export const GalleryContent: iNodeContent = {
  "#app": {
    content: {
      ...navigationMenu,
      "main#gallery": {
        // Built inside onCreated, so the tree cannot reveal it.
        options: { requires: ["masonry"] },
        onCreated: (el: HTMLElement, _renderFn: any, builderFn: any) => {
          el.mount(builderFn("masonry", GALLERY_RESPONSE.data));
        }
      }
    }
  }
};