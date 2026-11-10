export const setPlaceholderText = (element, text) => {
    element.innerHTML = "";
    element && element.tagName === "INPUT" && element instanceof HTMLInputElement ? (element.placeholder = text) : (element.textContent = text);
    return element;
};
export function __setloadingState(el, level, state = "loading", placeholderEl = null) {
    if (state === "start") {
        setPlaceholderText(placeholderEl, `Loading ${level} `);
        if (el instanceof HTMLInputElement) {
            el?.parentElement?.classList.add("loading");
            // const spinner = document.createElement("span");
            // spinner.className = "spinner";
            // el.parentElement?.appendChild(spinner);
        }
        if (el instanceof HTMLSelectElement) {
            el.classList.add("loading");
        }
    }
    else if (state === "complete") {
        el.classList.remove("error");
        if (el instanceof HTMLInputElement) {
            el?.parentElement?.classList.remove("loading");
            // el.parentElement?.querySelector(".spinner")?.remove()
        }
        if (el instanceof HTMLSelectElement) {
            el.classList.remove("loading");
        }
        const text = level === "kodepos" ? "Isi kodepos tujuan" : `Pilih ${level}`;
        setPlaceholderText(placeholderEl, text);
    }
    else {
        el.classList.remove("error");
        if (el instanceof HTMLInputElement) {
            el?.parentElement?.classList.remove("loading");
            // el.parentElement?.querySelector(".spinner")?.remove()
        }
        if (el instanceof HTMLSelectElement) {
            el.classList.remove("loading");
        }
    }
    return;
}
export function __setErrorState(el, level, _message, placeholderEl = null) {
    el.classList.remove("loading");
    el.classList.add("error");
    setPlaceholderText(placeholderEl, `Terjadi kesalahan saat memuat ${level}`);
}
//# sourceMappingURL=id-address-adapter.js.map