import type { iActionProperty, iBasicNode, iBuilderConfig, iBuilderRegistry } from "@aio-ui/core/interface";
import { Builder } from "@aio-ui/base/Base";
// import "./FabMenu.css";

export type FabPosition = "top-left" | "top-right" | "bottom-left" | "bottom-right" | "middle";

export type FabMenuElementType =
  | "@fab"
  | "@fab>panel"
  | "@fab>panel>title"
  | "@fab>panel>item"
  | "@fab>panel>trigger";

export interface iFabMenuConfig extends iBuilderConfig<FabMenuElementType> {
  container: string | HTMLElement | null;
  duration: number | null;
  position: FabPosition;
  closeOnSelected: boolean;
  closeIcon: string;
  displayIcon: string;
}

export class FabMenuBuilder extends Builder<FabMenuElementType, iFabMenuConfig> {
  readonly builderId: keyof iBuilderRegistry = "fab-menu";
  readonly name: keyof iBuilderRegistry = "fab-menu";
  readonly stylesheet: string = "./FabMenu.css";

  public config: Required<iFabMenuConfig>;
  private isMenuOpen = false;
  private idleTimer: number | undefined;

  constructor(config: Partial<iFabMenuConfig> = {}) {
    super();
    const defaultSelectors = {
      "@fab": { tagName: "div", className: "fab" },
      "@fab>panel": { tagName: "div", className: "panel" },
      "@fab>panel>title": { tagName: "span", className: "title" },
      "@fab>panel>item": { tagName: "button", className: "item option" },
      "@fab>panel>trigger": { tagName: "button", className: "trigger" },
    };

    const defaultConfig: Required<iFabMenuConfig> = {
      themeId: "default",
      container: null,
      position: "bottom-left",
      closeOnSelected: true,
      duration: 10000,
      closeIcon: "✕",
      displayIcon: "⚙️",
      selectors: defaultSelectors,
      namespace: null,
      emit: () => { }
    };

    this.config = this.resolveConfig(defaultConfig, config);
  }

  public prepare(content: iBasicNode, _config?: Partial<iFabMenuConfig>): HTMLElement {

    this._clearIdleTimer();
    this.isMenuOpen = false;

    const fab = this.render("@fab");
    const panel = this.render("@fab>panel", content.actions);
    const title = this.render("@fab>panel>title", content.title);
    if (title && panel) panel?.prepend(title);

    const trigger = this.render("@fab>panel>trigger", this.config);

    if (this.config.position.startsWith("bottom")) {
      if (panel) fab?.appendChild(panel);
      if (trigger) fab?.appendChild(trigger);
    } else {
      if (trigger) fab?.appendChild(trigger);
      if (panel) fab?.appendChild(panel);
    }

    return fab as HTMLElement;
  }



  /**
   * 👑 THE SEPARATED HYDRATION VALVE
   */
  protected template(typeKey: FabMenuElementType, el: HTMLElement, payload: any, props: iActionProperty): void {

    switch (typeKey) {
      case "@fab":
        el.className = `fab ${this.config.position} ${props.className || ""}`.trim();
        break;

      case "@fab>panel":
        for (const p of payload) {
          const item = this.render("@fab>panel>item", p)!;
          el.appendChild(item);
        }
        break;

      case "@fab>panel>title":
        el.textContent = (payload || "MENU").toUpperCase();
        break;

      case "@fab>panel>item": {
        // console.log({ payload, props });
        (el as HTMLButtonElement).type = payload.type || "button";
        el.textContent = payload.label || "Option";
        if (payload.id) el.id = payload.id;

        if (payload.isActive) el.classList.add("active");

        if (payload.className) el.className = `${el.className} ${payload.className}`.trim();

        // Listener
        el.onclick = (e: MouseEvent) => {
          if (payload.onClick) payload.onClick(e);

          if (this.config.closeOnSelected) {
            this.close();
          } else {
            this._resetIdleTimer();
          }
        };
        break;
      }

      case "@fab>panel>trigger": {
        el.title = "Click for switching options";
        el.textContent = payload.displayIcon;
        break;
      }
    }
  }

  public initialize(): void {
    const triggerBtn = this.load("@fab>panel>trigger") as HTMLButtonElement;

    if (triggerBtn) {
      triggerBtn.onclick = () => {
        if (this.isMenuOpen) {
          this.close();
        } else {
          this.open();
        }
      };
      // console.log("[FAB Lifecycle] Trigger button listener attached securely.");
    }
  }

  // ==============
  // Private Helper
  // ==============

  /**
   * 🔓 STATE MANAGEMENT: Membuka panel menu secara reaktif
   */
  public open(): void {
    if (this.isMenuOpen) return;
    this.isMenuOpen = true;

    const panel = this.load("@fab>panel") as HTMLElement;
    const trigger = this.load("@fab>panel>trigger") as HTMLButtonElement;

    if (panel) panel.classList.add("is-open");
    if (trigger) trigger.textContent = this.config.closeIcon;

    this._resetIdleTimer();
  }

  /**
   * 🔒 STATE MANAGEMENT: Menutup panel menu secara reaktif
   */
  public close(): void {
    if (!this.isMenuOpen) return;
    this.isMenuOpen = false;

    const panel = this.load("@fab>panel") as HTMLElement;
    const trigger = this.load("@fab>panel>trigger") as HTMLButtonElement;

    if (panel) panel.classList.remove("is-open");
    if (trigger) trigger.textContent = this.config.displayIcon;

    this._clearIdleTimer();
  }

  public unmount(): void {
    this._clearIdleTimer();
    const trigger = this.load("@fab>panel>trigger") as HTMLButtonElement;
    if (trigger) trigger.onclick = null;

    // Panggil fungsi utama pembersihan memori terpusat milik induk ksatria!
    this.destroy();
  }
  private _resetIdleTimer(): void {
    this._clearIdleTimer();

    if (!this.config.duration || this.config.duration <= 0) return;

    this.idleTimer = window.setTimeout(() => {
      if (this.isMenuOpen) {
        console.log(`[FAB Engine] ${(this.config?.duration as number || 1000) / 1000}s Idle reached. Auto-closing...`);
        this.close();
      }
    }, this.config.duration);
  }

  private _clearIdleTimer(): void {
    if (this.idleTimer) {
      window.clearTimeout(this.idleTimer);
      this.idleTimer = undefined;
    }
  }
}

