// =====================================================================
// HELPERS LANDING — presentasi & memulai wizard
// =====================================================================


/** Navigasi hash sederhana — HashRouter di main.ts mendengarkan hashchange. */
export function navigate(path: string): void {
  const clean = path.trim().replace(/^#/, "").replace(/^\/+/, "") || "home";
  if (path !== `#` + clean) window.location.hash = clean;
  else navScroll(path)
}


/** Gulir mulus ke sebuah anchor. */
export function navScroll(selector: string): (e: Event) => void {
  return (e) => {
    e.preventDefault();
    document.querySelector(selector)?.scrollIntoView({ behavior: "smooth", block: "start" });
    if (location.hash !== selector) history.replaceState(null, "", selector);
  };
}

/** Mengantar pengunjung ke karya yang pernah dibuat. */
export function requestStart(): void {
  document.querySelector("#gallery")?.scrollIntoView({ behavior: "smooth", block: "start" });
  if (location.hash !== "#gallery") history.replaceState(null, "", "#gallery");
}

export const navigationMenu = {
  "nav.nav": {
    content: {
      "button.toggle": {
        content: {
          "i.icon.hamburger": {}
        },
        onCreated: (el: HTMLElement) => {
          el.addEventListener("click", () => el.parentElement?.classList.toggle("expanded"))
        }
      },
      ".brand": {
        attrs: { href: "#home" },
        content: "Personal Portfolio",
        onCreated: (el: HTMLElement) => el.addEventListener("click", () => navigate("#home")),
      },
      ".navigations": {
        "a.item#home-link": { attrs: { href: "#home" }, content: "Home", onCreated: (el: HTMLElement) => el.addEventListener("click", () => navigate("#home")) },
        "a.item#about-link": { attrs: { href: "#about" }, content: "About", onCreated: (el: HTMLElement) => el.addEventListener("click", () => navigate("#about")) },
        "a.item#gallery-link": { attrs: { href: "#gallery" }, content: "Work", onCreated: (el: HTMLElement) => el.addEventListener("click", () => navigate("#gallery")) },
        "a.item#blog-link": { attrs: { href: "#blog" }, content: "Blog", onCreated: (el: HTMLElement) => el.addEventListener("click", () => navigate("#blog")) },
        "a.item#faq-link": { attrs: { href: "#faq" }, content: "FAQ", onCreated: (el: HTMLElement) => el.addEventListener("click", navScroll("#faq")) },
      },
      "button.button.primary#start-link": {
        content: "My Work",
        onCreated: (el: HTMLElement) => el.addEventListener("click", () => requestStart()),
      },
    }
  }
}