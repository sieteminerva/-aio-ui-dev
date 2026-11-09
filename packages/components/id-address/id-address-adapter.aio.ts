import { type IAddressAdapter } from "./id-address-adapter";

/**
 * // TODO search tidak jalan karena mungkin belum dikoneksikan pencariannya ke datashetnya
 * // lalu coba kita ketik (melakukan pencarian). dataset yg tadinya ada sebagai option hilang 
 * 
 * Adapter for `@aio-ui` markup.
 *
 * The picker has always been element-agnostic: an adapter drives whatever renders a
 * level. `native` assumes the platform's own controls — a plain `<select>`, or an
 * `<input>` fed by a `<datalist>` — and writes to them directly. That is enough for a
 * hand-written form, and wrong for this framework's own markup in three places:
 *
 * 1. **`option.placeholder`.** `input.css` styles a select's prompt through
 *    `select:has(option.placeholder:checked)` and `option.placeholder`. `native` builds
 *    its placeholder from `options[0]`'s text, so an aio select shows the prompt with the
 *    *value* colour and no capitalisation, and stale `[selected]` attributes keep a
 *    previous answer looking chosen.
 * 2. **`style: "select"` dropdowns.** An aio dropdown is either `data-style="datalist"`
 *    (an `<input list>` + `<datalist>`) or `data-style="select"` (a visible box, a hidden
 *    value, and `.menu > .item` rows). `native` knows only the datalist flavour, so a
 *    select-flavoured level received its rows and silently dropped them.
 * 3. **The component's event contract.** `native` calls the builder callback directly and
 *    never dispatches `change`, so writing a level was invisible to `elementChanged`, to
 *    `collectFormValues` and to anything else listening on the field.
 *
 * Nothing here is aio-specific *styling*: the adapter only uses the markup contract the
 * components already publish (`.dropdown[data-style]`, `input.dropdown`, the hidden value
 * carrier, `option.placeholder`, `.menu > .item`, `.field` for state), so it stays a
 * dependency-free DOM implementation — `@aio-ui/id-address` does not import the input
 * package to talk to it.
 */

/** The value carrier of a custom dropdown: the input that actually submits. */
interface iCarrier {
  /** Visible box (`input.dropdown`) or the plain control itself. */
  visible: HTMLInputElement | HTMLSelectElement;
  /** Hidden input holding the id, for a custom dropdown. */
  hidden: HTMLInputElement | null;
  /** The `div.dropdown` wrapper, when there is one. */
  box: HTMLElement | null;
}

/** The visible box of a custom dropdown: the text input the visitor types into. */
function visibleOf(box: HTMLElement | null): HTMLInputElement | null {
  if (!box) return null;
  return box.querySelector<HTMLInputElement>(':scope > input[type="text"], :scope > input:not([type="hidden"])');
}

/** Resolves the elements a level is built from, per flavour. */
function carrierOf(el: HTMLInputElement | HTMLSelectElement): iCarrier {
  const box = el.closest<HTMLElement>(".dropdown");
  const hidden = el instanceof HTMLInputElement && el.type === "hidden" ? el : null;

  // Some hosts mark the wrapper itself (`div.dropdown[data-level]`) instead of — or in
  // addition to — the hidden input. Resolve the carrier from the box in that case.
  if (el instanceof HTMLElement && el.classList.contains("dropdown")) {
    const carrier = box?.querySelector<HTMLInputElement>(':scope > input[type="hidden"]') ?? null;
    return { visible: visibleOf(box) ?? el, hidden: carrier, box };
  }

  if (hidden) {
    return { visible: visibleOf(box) ?? hidden, hidden, box };
  }

  // The visible box itself: its answer carrier is the hidden input beside it, when there
  // is one. (The framework renders `<input type="text" list>` + `<input type="hidden">`,
  // both direct children of `div.dropdown` — nothing carries a `.dropdown` class.)
  if (el instanceof HTMLInputElement) {
    return { visible: el, hidden: box?.querySelector<HTMLInputElement>(':scope > input[type="hidden"]') ?? null, box };
  }

  return { visible: el, hidden: null, box };
}

/** The `.field` a control lives in: the element that carries aio's loading/error state. */
function fieldOf(el: HTMLElement): HTMLElement | null {
  return el.closest<HTMLElement>(".field");
}

/** Options of the `style: "select"` flavour: `.menu > .item` rows. */
function menuOf(box: HTMLElement | null): HTMLElement | null {
  return box?.querySelector<HTMLElement>(":scope > .menu") ?? null;
}

/** The prompt of a select: a real `option.placeholder`, created when missing. */
function placeholderOf(select: HTMLSelectElement): HTMLOptionElement {
  const existing = select.querySelector<HTMLOptionElement>("option.placeholder");
  if (existing) return existing;

  const option = document.createElement("option");
  option.className = "placeholder";
  option.value = "";
  option.disabled = true;
  option.selected = true;
  select.prepend(option);
  return option;
}

/**
 * What a level says when it has nothing to offer yet.
 *
 * @param level - Level name (`propinsi`, `kota`, …).
 * @param state - Current load state.
 * @returns Prompt text for the control.
 */
function promptTextOf(level: string, state: string): string {
  if (state === "start" || state === "loading") return `Loading ${level} `;
  if (state === "empty") return `Tidak ada ${level}`;
  if (state === "error") return `Gagal memuat ${level}`;
  return level === "kodepos" ? "Isi kodepos tujuan" : `Pilih ${level}`;
}

/**
 * Writes the prompt without touching the rows.
 *
 * @param el - Select or visible input of a custom dropdown.
 * @param text - Prompt text.
 *
 * @summary The native helpers (`setPlaceholderText` / `__setloadingState`) clear the
 * element with `innerHTML = ""` before writing — fatal for a `<select>`, whose options
 * *are* its content: every state change wiped the prompt and the loaded rows, so the
 * placeholder vanished while loading and stayed an empty option afterwards even though
 * the request had answered.
 */
function setPromptText(el: HTMLInputElement | HTMLSelectElement, text: string): void {
  if (el instanceof HTMLSelectElement) {
    const prompt = placeholderOf(el);
    prompt.textContent = text;
    prompt.selected = true;
    return;
  }
  el.placeholder = text;
}

/** Drops the rows of a level, keeping its prompt. */
function dropRows(el: HTMLInputElement | HTMLSelectElement, visible: HTMLInputElement | HTMLSelectElement, box: HTMLElement | null): void {
  if (el instanceof HTMLSelectElement) {
    while (el.options.length > 1) el.remove(1);
    el.selectedIndex = 0;
    return;
  }

  menuOf(box)?.replaceChildren();
  const listId = visible.getAttribute("list");
  if (listId) document.getElementById(listId)?.replaceChildren();
  visible.value = "";
}

/**
 * Marker on the events this adapter dispatches itself.
 *
 * @summary The carrier that announces an answer is the same element `onLevelChange()`
 * listens to, so a naive `dispatchEvent()` re-entered the builder: write → `change` →
 * "level changed" → load next → write → … until the stack overflowed. The marker keeps the
 * announcement outward-only: components and pages of the host still see it, this adapter's
 * own listener ignores it.
 */
const SYNTHETIC = "__aioSyntheticAnswer";

/** Whether an event was dispatched by this adapter rather than by a visitor. */
function isSynthetic(event: Event): boolean {
  return Boolean((event as any)[SYNTHETIC]);
}

/**
 * Tells the page that a level changed.
 *
 * @param el - The element carrying the answer (the hidden input for a custom dropdown).
 *
 * @summary `native` called the builder's private callback; an aio control is a component
 * with listeners of its own, so the standard event has to be dispatched as well — marked,
 * so the adapter does not answer its own announcement.
 */
function announce(el: HTMLElement): void {
  for (const type of ["change", "input"] as const) {
    const event = new Event(type, { bubbles: true });
    (event as any)[SYNTHETIC] = true;
    el.dispatchEvent(event);
  }
}

export const IdAddressAdapterAio: IAddressAdapter = {
  init(_el: HTMLInputElement | HTMLSelectElement) {
    // Nothing to wire up front: the markup is already the contract. Kept because the
    // builder calls it once per level and an adapter may need its own bookkeeping.
  },

  setOptions(el: HTMLInputElement | HTMLSelectElement, args: any) {
    const level = el.dataset.level as string;
    const { options = [], state = "complete", onLevelChange } = args ?? {};
    const { visible, hidden, box } = carrierOf(el);
    const field = fieldOf(el);

    // Loading / error state has exactly one owner per flavour. `input.css` §7 draws a
    // spinner for `.field.loading` (input fields), for `select:is(.loading)::picker-icon`
    // (selects) and for `> .dropdown[data-style].loading::after` (custom dropdowns) — set
    // two of them and the field shows two spinners, one on top of the other.
    const busy = state === "start" || state === "loading";
    if (box) {
      // The box draws its own spinner; the field must stay out of it.
      box.classList.toggle("loading", busy);
      field?.classList.remove("loading");
    } else {
      el.classList.toggle("loading", busy);
      // A select already carries its spinner in the picker icon; a plain input has none
      // of its own, so that one lives on the field.
      if (!(el instanceof HTMLSelectElement)) field?.classList.toggle("loading", busy);
    }
    field?.classList.toggle("error", state === "error");

    // The prompt survives every state: it is the answer to "what is this level for",
    // and it used to be the first casualty of a reload.
    setPromptText(el instanceof HTMLSelectElement ? el : visible, promptTextOf(level, state));

    if (state !== "complete") {
      // A stale child list under a reloading parent is worse than no list at all.
      dropRows(el, visible, box);
      if (hidden) hidden.value = "";
      el.__onLevelChange = onLevelChange;
      return;
    }

    // ── Flavour 1: a native select rendered by `InputBuilder` ─────────────────────
    if (el instanceof HTMLSelectElement) {
      dropRows(el, visible, box);

      for (const row of options as any[]) {
        const option = document.createElement("option");
        option.value = String(row[`${level}_id`]);
        option.textContent = String(row[`${level}_name`]);
        option.dataset.id = String(row[`${level}_id`]);
        el.appendChild(option);
      }

      el.__onLevelChange = onLevelChange;
      return;
    }

    // ── Flavour 2: `data-style="select"` — a hidden value and a menu of items ─────
    const menu = menuOf(box);
    if (menu) {
      menu.replaceChildren(
        ...(options as any[]).map((row) => {
          const item = document.createElement("div");
          item.className = "item";
          item.dataset.id = String(row[`${level}_id`]);
          item.textContent = String(row[`${level}_name`]);
          return item;
        })
      );
      visible.value = "";
      if (visible instanceof HTMLInputElement && !visible.placeholder) visible.placeholder = `Pilih ${level}`;
      if (hidden) hidden.value = "";
      el.__onLevelChange = onLevelChange;
      return;
    }

    // ── Flavour 3: `data-style="datalist"` — `<input list>` + `<datalist>` ────────
    const listId = visible.getAttribute("list");
    const datalist = listId ? document.getElementById(listId) as HTMLDataListElement | null : null;
    if (datalist) {
      datalist.replaceChildren(
        ...(options as any[]).map((row) => {
          const option = document.createElement("option");
          option.value = String(row[`${level}_name`]);
          option.dataset.id = String(row[`${level}_id`]);
          return option;
        })
      );
      datalist.dataset.options = JSON.stringify(
        (options as any[]).map((row) => ({ id: row[`${level}_id`], label: row[`${level}_name`] }))
      );
      visible.value = "";
      if (hidden) hidden.value = "";
      el.__onLevelChange = onLevelChange;
      return;
    }

    // ── Flavour 4: a plain input (the postal code) ────────────────────────────────
    // No list, no menu: this level resolves to exactly one row and the answer *is* the
    // input's value. Without this branch the row arrived and was dropped, so `kodepos`
    // stayed empty while the request had succeeded.
    const first = (options as any[])[0];
    if (first) {
      const answer = first[`${level}_name`] ?? first[`${level}_id`] ?? "";
      visible.value = answer === null || answer === undefined ? "" : String(answer);
    }
    el.__onLevelChange = onLevelChange;
  },

  setSelectedOption(el: HTMLInputElement | HTMLSelectElement, value: any) {
    if (el.classList.contains("error")) el.classList.remove("error");

    if (el instanceof HTMLSelectElement) {
      el.value = value;
      const chosen = el.selectedOptions?.[0] ?? null;
      el.querySelectorAll("option[selected]").forEach((option) => option.removeAttribute("selected"));
      chosen?.setAttribute("selected", "");
      chosen?.classList.add("active", "selected");
      announce(el);
      return;
    }

    const { visible, hidden } = carrierOf(el);
    const listId = visible.getAttribute("list");
    const datalist = listId ? document.getElementById(listId) : null;
    const label = datalist?.querySelector(`option[data-id="${CSS.escape(String(value))}"]`)?.getAttribute("value")
      ?? menuOf(el.closest<HTMLElement>(".dropdown"))?.querySelector<HTMLElement>(`.item[data-id="${CSS.escape(String(value))}"]`)?.textContent
      ?? String(value);

    visible.value = label;
    if (hidden) hidden.value = String(value);
    else if (el !== visible) el.value = String(value);

    // Mark the active row so the menu shows the current answer after a re-open.
    const menu = menuOf(el.closest<HTMLElement>(".dropdown"));
    menu?.querySelectorAll(".item").forEach((item) => {
      item.classList.toggle("selected", item.getAttribute("data-id") === String(value));
    });

    announce(hidden ?? visible);
  },

  onLevelChange(el: HTMLInputElement | HTMLSelectElement) {
    const level = el.dataset.level;
    const { hidden } = carrierOf(el);

    // A custom dropdown answers through its hidden input; the visible box is a search
    // field, so listening on it would report a keyword as an answer.
    const source = hidden ?? el;
    if (source.dataset.level !== level) source.dataset.level = String(level);

    if (source.__aioChangeHandler) source.removeEventListener("change", source.__aioChangeHandler);

    source.__aioChangeHandler = (event: Event) => {
      // Our own announcement — the answer is already recorded, answering it again would
      // reload the level and recurse.
      if (isSynthetic(event)) return;

      const carrier = carrierOf(el);
      const value = carrier.hidden ? carrier.hidden.value : (el instanceof HTMLSelectElement ? el.value : el.value);
      const label = carrier.hidden
        ? carrier.visible.value
        : (el instanceof HTMLSelectElement ? el.selectedOptions?.[0]?.textContent?.trim() : el.value);

      (el as any).__onLevelChange?.(
        value === "" || value === null || value === undefined
          ? null
          : { [`${level}_id`]: value, [`${level}_name`]: label }
      );
    };

    source.addEventListener("change", source.__aioChangeHandler);
  },

  onError(el: HTMLInputElement | HTMLSelectElement, message: string) {
    const level = el.dataset.level as string;
    const { visible, hidden, box } = carrierOf(el);

    el.classList.add("error");
    box?.classList.add("error");
    fieldOf(el)?.classList.add("error");

    dropRows(el, visible, box);
    el.value = "";
    if (hidden) hidden.value = "";
    if (visible !== el) visible.value = "";

    // The message is advisory: the prompt states what happened, `data-error` keeps the
    // full text available without turning the control into a text block.
    setPromptText(el instanceof HTMLSelectElement ? el : visible, message || promptTextOf(level, "error"));
    el.dataset.error = message;
  },

  getValue(el: HTMLInputElement | HTMLSelectElement) {
    const { hidden } = carrierOf(el);
    return hidden ? hidden.value : el.value;
  },

  clear(el: HTMLInputElement | HTMLSelectElement) {
    const { visible, hidden, box } = carrierOf(el);

    box?.classList.remove("loading", "error", "selected");
    fieldOf(el)?.classList.remove("loading", "error");
    el.classList.remove("loading", "error", "active", "selected");

    if (el instanceof HTMLSelectElement) {
      const prompt = placeholderOf(el);
      while (el.options.length > 1) el.remove(1);
      el.selectedIndex = 0;
      prompt.selected = true;
      announce(el);
      return;
    }

    const menu = menuOf(box);
    menu?.replaceChildren();

    const listId = visible.getAttribute("list");
    document.getElementById(listId ?? "")?.replaceChildren();

    visible.value = "";
    if (hidden) hidden.value = "";
    if (visible !== el) el.value = "";
  },

  destroy(el: HTMLInputElement | HTMLSelectElement) {
    const { hidden } = carrierOf(el);
    const source = hidden ?? el;

    if (source.__aioChangeHandler) {
      source.removeEventListener("change", source.__aioChangeHandler);
      delete (source as any).__aioChangeHandler;
    }

    delete (el as any).__onLevelChange;
    delete (el as any).__isDropdown;

    el.classList.remove("loading", "error", "active", "selected");
    fieldOf(el)?.classList.remove("loading", "error");
  },
};

declare global {
  interface HTMLSelectElement {
    /** This adapter's own `change` listener, so re-initialising never doubles it. */
    __aioChangeHandler?: (event: Event) => void;
  }

  interface HTMLInputElement {
    __aioChangeHandler?: (event: Event) => void;
  }
}
