export class HorizontalScrollingPage {
    config;
    currentShell = null;
    menuRef = null;
    toggleButton = null;
    timelineLabelElement = null;
    panelElementsCache = [];
    styleElement = null;
    scrollTimeout = null;
    panelListeners = new Map();
    // 💡 Menyimpan referensi listener resize agar bisa dibersihkan saat unmount
    resizeListener = () => {
        this.pageScrollListener();
    };
    // State untuk melacak sentuhan mobile
    touchStartX = 0;
    touchStartY = 0;
    scrollLeftStart = 0;
    constructor(config = {}) {
        this.config = {
            bottomZoneHeight: config.bottomZoneHeight ?? 150,
            horizontalMultiplier: config.horizontalMultiplier ?? 15,
            fallbackMultiplier: config.fallbackMultiplier ?? 1.2,
            defaultSectionName: config.defaultSectionName ?? "EXPLORE",
            autoInjectNavLayout: config.autoInjectNavLayout ?? true,
            selectors: {
                "@shell": { tagName: "div", className: "theme-horizontal" },
                "@panel": { tagName: "section", className: "horizontal" },
                "@nav": { tagName: "nav", className: "nav" },
                "@trigger": { tagName: "button", className: "sidebar trigger" },
                ...(config.selectors || {}),
            },
            onNavFound: config.onNavFound ?? ((navElement, toggleButton) => {
                navElement.insertBefore(toggleButton, navElement.firstElementChild);
                toggleButton.addEventListener("click", () => {
                    navElement.classList.toggle("expanded");
                });
            }),
        };
    }
    resolveSelector(key) {
        const prop = this.config.selectors[key];
        if (!prop)
            return "";
        const tag = prop.tagName ? prop.tagName.trim() : "";
        const classes = prop.className ? prop.className.trim().split(/\s+/).join(".") : "";
        if (tag && classes) {
            return `${tag}.${classes}`;
        }
        else if (tag) {
            return tag;
        }
        else if (classes) {
            return `.${classes}`;
        }
        return "";
    }
    wheelHijackListener = (e) => {
        if (!this.currentShell)
            return;
        const cursorY = e.clientY;
        const totalScreenHeight = window.innerHeight;
        const bottomZoneThreshold = totalScreenHeight - this.config.bottomZoneHeight;
        const activePanel = e.target;
        const panelSelector = this.resolveSelector("@panel");
        const basePanelClass = panelSelector.includes(".") ? panelSelector.split(".")[1] : panelSelector;
        const closestPanel = activePanel.closest(`.${basePanelClass}`);
        if (cursorY >= bottomZoneThreshold) {
            e.preventDefault();
            this.currentShell.scrollLeft += e.deltaY * this.config.horizontalMultiplier;
            return;
        }
        if (closestPanel) {
            const scrollHeight = closestPanel.scrollHeight;
            const clientHeight = closestPanel.clientHeight;
            if (scrollHeight > clientHeight) {
                const isAtTop = closestPanel.scrollTop === 0;
                const isAtBottom = Math.abs(scrollHeight - clientHeight - closestPanel.scrollTop) < 1;
                if (!(isAtTop && e.deltaY < 0) && !(isAtBottom && e.deltaY > 0)) {
                    closestPanel.scrollTop += e.deltaY;
                    e.preventDefault();
                    return;
                }
            }
        }
    };
    mouseMoveListener = (e) => {
        if (!this.currentShell || !this.timelineLabelElement)
            return;
        const cursorY = e.clientY;
        const totalScreenHeight = window.innerHeight;
        const bottomZoneThreshold = totalScreenHeight - this.config.bottomZoneHeight;
        if (cursorY >= bottomZoneThreshold) {
            this.currentShell.classList.add("show-scrollbar");
            this.timelineLabelElement.classList.add("visible");
        }
        else {
            this.currentShell.classList.remove("show-scrollbar");
            this.timelineLabelElement.classList.remove("visible");
        }
    };
    mouseLeaveListener = () => {
        if (!this.currentShell || !this.timelineLabelElement)
            return;
        this.currentShell.classList.remove("show-scrollbar");
        this.timelineLabelElement.classList.remove("visible");
    };
    touchStartListener = (e) => {
        if (!this.currentShell)
            return;
        this.touchStartX = e.touches[0].clientX;
        this.touchStartY = e.touches[0].clientY;
        this.scrollLeftStart = this.currentShell.scrollLeft;
    };
    touchMoveListener = (e) => {
        if (!this.currentShell)
            return;
        const touchX = e.touches[0].clientX;
        const touchY = e.touches[0].clientY;
        const deltaX = this.touchStartX - touchX;
        const deltaY = this.touchStartY - touchY;
        // Tentukan apakah user sedang berniat scroll vertikal di dalam panel atau swipe horizontal halaman
        const activePanel = e.target;
        const panelSelector = this.resolveSelector("@panel");
        const basePanelClass = panelSelector.includes(".") ? panelSelector.split(".")[1] : panelSelector;
        const closestPanel = activePanel.closest(`.${basePanelClass}`);
        if (closestPanel && closestPanel.scrollHeight > closestPanel.clientHeight) {
            // Jika panel punya konten vertikal dan gerakan vertikal lebih dominan dibanding horizontal, biarkan scroll vertikal panel berjalan
            if (Math.abs(deltaY) > Math.abs(deltaX)) {
                return;
            }
        }
        // Jika gerakan horizontal lebih dominan atau di area luar panel, geser shell secara horizontal
        this.currentShell.scrollLeft = this.scrollLeftStart + deltaX;
        // Cegah perilaku default (seperti pull-to-refresh bawaan browser yang mengganggu)
        e.preventDefault();
    };
    pageScrollListener = () => {
        if (!this.timelineLabelElement || this.panelElementsCache.length === 0)
            return;
        if (this.scrollTimeout)
            return;
        this.scrollTimeout = window.requestAnimationFrame(() => {
            this.scrollTimeout = null;
            let currentActiveName = this.config.defaultSectionName;
            const viewportCenterX = window.innerWidth / 2;
            for (const panel of this.panelElementsCache) {
                const rect = panel.getBoundingClientRect();
                if (rect.left <= viewportCenterX && rect.right >= viewportCenterX) {
                    currentActiveName = panel.getAttribute("data-name") || panel.id || "SECTION";
                    break;
                }
            }
            if (this.timelineLabelElement && this.timelineLabelElement.textContent !== currentActiveName) {
                this.timelineLabelElement.textContent = currentActiveName;
            }
        });
    };
    injectDynamicStyles() {
        const shellProp = this.config.selectors["@shell"];
        const panelProp = this.config.selectors["@panel"];
        const shellClassName = shellProp?.className ? shellProp.className.split(" ")[0] : "theme-horizontal";
        const navSelector = this.resolveSelector("@nav");
        const panelClassName = panelProp?.className ? panelProp.className.split(" ")[0] : "horizontal";
        this.styleElement = document.createElement("style");
        this.styleElement.id = "horizontal-scrolling-page-styles";
        this.styleElement.textContent = `
      .timeline.label {
        position: fixed;
        bottom: 35px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 1001;
        background: var(--app-primary-color, #333);
        color: #ffffff;
        padding: 6px 16px;
        border-radius: 20px;
        font-size: 11px;
        font-weight: 600;
        letter-spacing: 1.2px;
        text-transform: uppercase;
        pointer-events: none;
        backdrop-filter: blur(4px);
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
        border: 1px solid rgba(255, 255, 255, 0.1);
        opacity: 0;
        transition: opacity 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), transform 0.2s;
      }
      .timeline.label.visible {
        opacity: 1;
      }

      .${shellClassName} {
        scrollbar-width: none;
        -ms-overflow-style: none;
        --sidebar-width: var(--sidebar-collapsed-width, 70px);
        margin-left: var(--sidebar-width);
        transition: margin-left 0.3s ease;
      }
      .${shellClassName}::-webkit-scrollbar {
        height: 6px;
        display: none;
      }
      .${shellClassName}.show-scrollbar::-webkit-scrollbar {
        display: block;
      }
      .${shellClassName}.show-scrollbar {
        scrollbar-width: thin;
      }

      body:has(${navSelector}.expanded) .${shellClassName} {
        --sidebar-width: var(--sidebar-expanded-width, 260px);
      }

      .${shellClassName} .${panelClassName} {
        overflow-y: auto;
        scrollbar-width: none;
        -ms-overflow-style: none;
        scrollbar-gutter: stable;
      }
      .${shellClassName} .${panelClassName}::-webkit-scrollbar {
        width: 6px;
        display: none;
      }
      .${shellClassName} .${panelClassName}.show-scrollbar {
        scrollbar-width: thin !important;
      }
      .${shellClassName} .${panelClassName}.show-scrollbar::-webkit-scrollbar {
        display: block !important;
      }

      ${this.config.autoInjectNavLayout ? `
        .${shellClassName} ${navSelector} {
          position: fixed;
          top: 0;
          left: 0;
          bottom: 0;
          display: flex !important;
          flex-direction: column !important;
          box-sizing: border-box;
          z-index: 1000;
          transition: width 0.3s ease;
          width: var(--sidebar-collapsed-width, 70px);
        }
        .${shellClassName} ${navSelector}.expanded {
          width: var(--sidebar-expanded-width, 260px);
        }
        .${shellClassName} ${navSelector} > .navigations {
          display: flex !important;
          flex-direction: column !important;
          flex: 1;
          overflow-y: auto;
        }
        .${shellClassName} ${navSelector} > .actions {
          margin-top: auto;
        }
      ` : ''}
    `;
        document.head.appendChild(this.styleElement);
    }
    createTimelineLabel() {
        this.injectDynamicStyles();
        const el = document.createElement("div");
        el.className = "timeline label";
        document.body.append(el);
        return el;
    }
    activate(shell, elements) {
        this.currentShell = shell;
        const shellProp = this.config.selectors["@shell"];
        const shellClassName = shellProp?.className ? shellProp.className.split(" ")[0] : "theme-horizontal";
        shell.classList.add(shellClassName);
        document.body.dataset.theme = shellClassName;
        const rawElements = Array.from(elements);
        const panelSelector = this.resolveSelector("@panel");
        const panelClassName = panelSelector.includes(".") ? panelSelector.split(".")[1] : panelSelector;
        this.panelElementsCache = rawElements.filter(el => el.classList.contains(panelClassName));
        if (this.panelElementsCache.length === 0) {
            this.panelElementsCache = rawElements;
        }
        this.panelElementsCache.forEach(panel => {
            const enterListener = () => {
                if (panel.scrollHeight > panel.clientHeight) {
                    panel.classList.add("show-scrollbar");
                }
            };
            const leaveListener = () => panel.classList.remove("show-scrollbar");
            panel.addEventListener("mouseenter", enterListener);
            panel.addEventListener("mouseleave", leaveListener);
            this.panelListeners.set(panel, { enter: enterListener, leave: leaveListener });
        });
        this.timelineLabelElement = this.createTimelineLabel();
        if (!this.timelineLabelElement.textContent) {
            this.timelineLabelElement.textContent = this.config.defaultSectionName;
        }
        const navSelector = this.resolveSelector("@nav");
        this.menuRef = shell.querySelector(navSelector) || document.querySelector(navSelector);
        if (this.menuRef && this.config.onNavFound) {
            this.toggleButton = document.createElement("button");
            this.toggleButton.className = this.config.selectors["@trigger"]?.className || "sidebar trigger";
            this.config.onNavFound(this.menuRef, this.toggleButton);
        }
        shell.addEventListener("wheel", this.wheelHijackListener, { passive: false });
        shell.addEventListener("mousemove", this.mouseMoveListener);
        shell.addEventListener("mouseleave", this.mouseLeaveListener);
        shell.addEventListener("scroll", this.pageScrollListener, { passive: true });
        shell.addEventListener("touchstart", this.touchStartListener, { passive: true });
        shell.addEventListener("touchmove", this.touchMoveListener, { passive: false });
        // 💡 Daftarkan listener resize window agar posisi section tetap sinkron
        window.addEventListener("resize", this.resizeListener);
        this.pageScrollListener();
    }
    deactivate(shell) {
        if (this.currentShell) {
            this.currentShell.removeEventListener("wheel", this.wheelHijackListener);
            this.currentShell.removeEventListener("mousemove", this.mouseMoveListener);
            this.currentShell.removeEventListener("mouseleave", this.mouseLeaveListener);
            this.currentShell.removeEventListener("scroll", this.pageScrollListener);
            this.currentShell.removeEventListener("touchstart", this.touchStartListener);
            this.currentShell.removeEventListener("touchmove", this.touchMoveListener);
        }
        // 💡 Bersihkan listener resize window
        window.removeEventListener("resize", this.resizeListener);
        this.panelListeners.forEach((listeners, panel) => {
            panel.removeEventListener("mouseenter", listeners.enter);
            panel.removeEventListener("mouseleave", listeners.leave);
            panel.classList.remove("show-scrollbar");
        });
        this.panelListeners.clear();
        if (this.scrollTimeout) {
            window.cancelAnimationFrame(this.scrollTimeout);
            this.scrollTimeout = null;
        }
        if (this.timelineLabelElement && this.timelineLabelElement.parentNode) {
            this.timelineLabelElement.parentNode.removeChild(this.timelineLabelElement);
        }
        if (this.styleElement && this.styleElement.parentNode) {
            this.styleElement.parentNode.removeChild(this.styleElement);
        }
        if (this.toggleButton && this.toggleButton.parentNode) {
            this.toggleButton.parentNode.removeChild(this.toggleButton);
        }
        if (this.menuRef) {
            this.menuRef.classList.remove("expanded");
        }
        if (shell) {
            const shellProp = this.config.selectors["@shell"];
            const shellClassName = shellProp?.className ? shellProp.className.split(" ")[0] : "theme-horizontal";
            shell.classList.remove(shellClassName);
            shell.removeAttribute("style");
        }
        delete document.body.dataset.theme;
        this.currentShell = null;
        this.menuRef = null;
        this.toggleButton = null;
        this.timelineLabelElement = null;
        this.styleElement = null;
        this.panelElementsCache = [];
        console.log("[HorizontalTheme] Clean unmount executed. Framework is ready for the next transformation.");
    }
}
//# sourceMappingURL=HorizontalScrolling.js.map