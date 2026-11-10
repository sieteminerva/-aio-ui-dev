/**
 * MODUL: FADE IN (Web Animations API)
 *
 * Port dari _handleFadeIn lama di AnimationsService:
 * - delay dinamis dibaca dari atribut data-fade-delay (default '0s'),
 * - variabel --fade-delay / --fade-duration di-set ulang tiap eksekusi,
 * - pre-hide CSS memakai visibility:hidden (elemen tetap memegang ruang
 *   layout) — dibuka inline saat animasi mulai, lalu opacity 0 -> 1 +
 *   translateY(10px) -> 0 (500ms, ease-out) via WAAPI fill:forwards,
 * - event 'animation:done' dipicu lewat Promise .finished bawaan WAAPI.
 */
class FadeInBehaviour {
    static async animate(node, options, onDone) {
        // Contoh animasi lain: Menyiapkan delay dinamis jika diatur via HTML
        const delay = node.getAttribute('data-fade-delay') || '0s';
        node.style.setProperty('--fade-delay', delay);
        node.style.setProperty('--fade-duration', options.duration);
        // Buka visibility inline (mengalahkan visibility:hidden dari stylesheet)
        // di task yang sama dengan mulainya animasi — keyframe pertama opacity:0
        // menjamin tidak ada frame yang terlihat setengah jalan.
        node.style.visibility = 'visible';
        const anim = node.animate([
            { opacity: 0, transform: 'translateY(10px)' },
            { opacity: 1, transform: 'translateY(0)' }
        ], {
            duration: 500,
            easing: 'ease-out',
            fill: 'forwards'
        });
        // WAAPI memiliki Promise .finished bawaan yang sangat akurat
        anim.finished
            .then(() => {
            if (!node.isConnected)
                return;
            onDone();
        })
            .catch((error) => {
            // cancel() rejects finished with AbortError during reset/stop.
            if (!(error instanceof DOMException) || error.name !== 'AbortError') {
                console.error('[FadeInBehaviour] Animation failed:', error);
            }
        });
    }
}
/** `animation="fade-in"` — WAAPI opacity/translate entrance. */
export const fadeInBehaviour = {
    type: 'fade-in',
    // The config block predates the hyphenated attribute value.
    optionKey: 'fade',
    animate: ({ node, options, done }) => FadeInBehaviour.animate(node, options, () => done()),
};
//# sourceMappingURL=fade-in.js.map