class LoadingPlaceholderBehaviour {
    static async animate(node, options, onDone, isStopped = () => false) {
        // ⏳ Resolusi urutan prioritas delay:
        // data-delay milik node > konfigurasi modul > fallback 500ms.
        const attrDuration = node.getAttribute("data-duration");
        const parsedAttrDelay = attrDuration !== null ? parseInt(attrDuration, 10) : NaN;
        const duration = Number.isFinite(parsedAttrDelay)
            ? parsedAttrDelay
            : (Number(options.duration) || 500);
        const settledDelay = Number.isFinite(duration) ? Math.max(0, duration) : 0;
        window.setTimeout(() => {
            // Diabort = run sudah tidak relevan; jangan menembak onDone agar rantai
            // tidak maju di atas elemen yang sedang di-reset/dilepas.
            if (isStopped())
                return;
            // Elemen boleh saja sudah dicabut layar saat menunggu — hindari operasi mayat.
            if (!node.isConnected) {
                onDone();
                return;
            }
            // 🌅 FASE 1 — TARUHAN TRANSISI (menghidupkan kurva CSS).
            // Aturan `[data-anim-hold-opacity]` di Animations.css memiliki blok
            // transition yang aktif SELAMA atribut cadangan masih menempel, jadi
            // pelepasan warna/border/opasitas berikutnya bergerak halus, bukan nyablak.
            const releaseDuration = Math.max(200, parseInt(String(options.instantRevealDelayTime ?? 200), 10) || 200);
            // console.log({ releaseDuration })
            const restoreOriginalOpacity = () => {
                const backupValue = node.getAttribute("data-anim-hold-opacity");
                if (backupValue === null)
                    return; // Tidak ada cadangan → hormati kondisi inline eksisting.
                if (backupValue.trim() === "") {
                    // Cadangan kosong = semula tanpa inline opacity.
                    if (options.restoreFallbackOpacity !== undefined && String(options.restoreFallbackOpacity).trim() !== "") {
                        node.style.opacity = String(options.restoreFallbackOpacity);
                    }
                    else {
                        node.style.removeProperty("opacity");
                    }
                }
                else {
                    node.style.opacity = backupValue;
                }
            };
            // 🌘 FASE 2 — BUKA GEMBOK UTAMA: lepas kulit shimmer (warna & border
            // transparan ikut hilang bersamanya). Transisi CSS yang barusan
            // dipasang menjamin pergantian visual teranimasi alami.
            node.classList.remove("anim-placeholder-active");
            restoreOriginalOpacity();
            // 🧹 FASE 3 — PEMBERSIHAN JEJAK DI KEAMANAN DIGITAL FRAMEWORK:
            // hapus cadangan & token animation agar pemindaian init() berikutnya
            // tidak menjalankan ulang perilaku ini (idempotent).
            node.removeAttribute("data-anim-hold-opacity");
            if (node.getAttribute("animation") === "loading-placeholder") {
                node.removeAttribute("animation");
            }
            // Lanjutkan sisa transisi layar dalam waktu singkat tanpa residu inline.
            window.setTimeout(() => {
                node.style.removeProperty("transition");
            }, releaseDuration);
            // ⛓️ RANTAI LANJUTAN: beri tahu AnimationsService bahwa elemen ini tuntas
            // sehingga sibling ber-atribut animation-chain="true" boleh tampil.
            onDone();
        }, settledDelay);
    }
}
/** `animation="loading-placeholder"` — anti-FOUC release of a frozen placeholder. */
export const loadingPlaceholderBehaviour = {
    type: 'loading-placeholder',
    optionKey: 'loadingPlaceholder',
    animate: ({ node, options, stopped, done }) => LoadingPlaceholderBehaviour.animate(node, options, () => done(), stopped),
};
//# sourceMappingURL=loading-placeholder.js.map