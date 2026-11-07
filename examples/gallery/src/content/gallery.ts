import type { iNodeContent } from "@aio-ui/core/interface";
import { navigationMenu } from "./shared";
import GALLERY_RESPONSE from "./gallery.json";
export const GalleryContent: iNodeContent = {
  "#app": {
    content: {
      ...navigationMenu,
      "main#gallery": {
        // Mounted inside onCreated; `builder` is reserved and never rendered.
        builder: ["masonry"],
        onCreated: (el: HTMLElement, _renderFn: any, builderFn: any) => {
          el.mount(builderFn("masonry", GALLERY_RESPONSE.data));
        }
      }
    }
  }
};