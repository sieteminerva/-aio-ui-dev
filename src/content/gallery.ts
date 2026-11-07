import type { iNodeContent } from "../lib/interface";
import { navigationMenu } from "./shared";
import GALLERY_RESPONSE from "./gallery.json";
export const GalleryContent: iNodeContent = {
  "#app": {
    content: {
      ...navigationMenu,
      "main#gallery": {
        onCreated: (el: HTMLElement, _renderFn: any, builderFn: any) => {
          el.mount(builderFn("masonry", GALLERY_RESPONSE.data));
        }
      }
    }
  }
};