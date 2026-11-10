class CountUpBehaviour {
    static animate(node) {
        // Contoh animasi angka dinamis (misal statistik: 0 ke 100)
        const targetNumber = parseInt(node.textContent || '', 10) || 0;
        node.setAttribute('data-target-number', String(targetNumber));
        // Logika JS count-up Anda di sini...
    }
}
/** `animation="count-up"` — reads the target number and hands it to the counter. */
export const countUpBehaviour = {
    type: 'count-up',
    animate: ({ node, done }) => {
        CountUpBehaviour.animate(node);
        // Synchronous behaviour: completes as soon as the target is recorded.
        done();
    },
};
//# sourceMappingURL=count-up.js.map