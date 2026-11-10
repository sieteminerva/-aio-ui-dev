class TypewriterBehaviour {
    /**
     * Pemecah karakter menggunakan Intl.Segmenter (grapheme murni)
     */
    static getCharacters(text) {
        // @ts-ignore
        const segmenter = new Intl.Segmenter(document.documentElement.lang || 'id', { granularity: 'grapheme' });
        return [...segmenter.segment(text)].map(s => s.segment);
    }
    static sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
    static rng(min, max) {
        return Math.floor(Math.random() * (max - min) + min);
    }
    /** Jeda antar karakter — ambil nilai acak bila interval berupa array (dikali faktor kecepatan) */
    static async _typingInterval(options, speedFactor = 1) {
        if (Array.isArray(options.interval)) {
            await this.sleep(options.interval[this.rng(0, options.interval.length)] * speedFactor);
        }
        else {
            await this.sleep(options.interval * speedFactor);
        }
    }
    /**
     * Hitung ritme jeda tanda baca (Anti-tabrakan Spasi):
     * - akhir kalimat (. ! ? diikuti spasi/baris baru/akhir teks) -> jeda penuh,
     *   atau setengahnya saat mode rewrite aktif;
     * - jeda pendek (; : ,) -> delay / 6.
     * Bila tanda pendek diikuti spasi, spasi langsung dilekatkan ke layar dan pemanggil
     * diminta melompati indeks spasi tersebut (swallowNextChar).
     */
    static _punctuationRhythm(char, nextChar, el, options) {
        const sentenceEnders = ['.', '!', '?'];
        const shortPauses = [',', ';', ':'];
        if (sentenceEnders.includes(char)) {
            if (!nextChar || nextChar === ' ' || nextChar === '\n') {
                return { pauseMs: options.rewrite ? options.delay / 2 : options.delay, swallowNextChar: false };
            }
        }
        else if (shortPauses.includes(char)) {
            const swallowNextChar = nextChar === ' ';
            if (swallowNextChar)
                el.textContent += nextChar; // Tempelkan spasi langsung agar tidak bertabrakan
            return { pauseMs: options.delay / 6, swallowNextChar };
        }
        return { pauseMs: 0, swallowNextChar: false };
    }
    /** Fase ketik: tempelkan karakter satu-per-satu mengikuti ritme interval & jeda tanda baca */
    static async _typeOut(node, el, characters, options, isStopped = () => false) {
        // --- PROSES KETIK ---
        for (let i = 0; i < characters.length; i++) {
            if (!node.isConnected || isStopped())
                return;
            const char = characters[i];
            el.textContent += char;
            await this._typingInterval(options);
            // HITUNG RITME JEDA TANDA BACA (Anti-tabrakan Spasi)
            const rhythm = this._punctuationRhythm(char, characters[i + 1], el, options);
            if (rhythm.swallowNextChar)
                i++; // Lewati indeks spasi agar tidak bertabrakan
            if (rhythm.pauseMs > 0) {
                el.classList.remove('tw-writing');
                await this.sleep(rhythm.pauseMs);
                if (!node.isConnected || isStopped())
                    return;
                el.classList.add('tw-writing');
            }
        }
    }
    /**
     * Fase hapus mundur: untuk kalimat bukan-terakhir (atau saat mode loop aktif),
     * teks dikosongkan kembali dengan efek hapus super cepat (interval x 0.1).
     */
    static async _deleteBackwards(node, el, options, isLastSentence, isStopped = () => false) {
        if (!isLastSentence || options.loop) {
            el.classList.add('tw-writing');
            while (el.textContent !== '') {
                if (!node.isConnected || isStopped())
                    return;
                const currentChars = this.getCharacters(el.textContent);
                currentChars.pop();
                el.textContent = currentChars.join('');
                // Efek hapus super cepat (dikali 0.1) sesuai permintaan draf Anda
                await this._typingInterval(options, 0.1);
            }
            await this.sleep(200); // Jeda kecil setelah kosong
        }
        else {
            el.classList.remove('tw-writing');
        }
    }
    /**
     * Core Engine Typewriter Effect (Konsisten & Unified):
     * merangkai fase ketik -> jeda membaca -> hapus mundur untuk SATU kalimat.
     */
    static async _typewriterEffect(node, el, targetText, options, isLastSentence, isStopped = () => false) {
        const characters = this.getCharacters(targetText);
        el.textContent = '';
        el.style.whiteSpace = 'normal';
        el.style.wordBreak = 'break-word';
        el.classList.add('tw-writing');
        // --- FASE KETIK ---
        await this._typeOut(node, el, characters, options, isStopped);
        if (!node.isConnected || isStopped())
            return;
        // --- FASE JEDA MEMBACA ---
        el.classList.remove('tw-writing');
        await this.sleep(options.delay);
        if (!node.isConnected || isStopped())
            return;
        // --- FASE HAPUS MUNDUR ---
        await this._deleteBackwards(node, el, options, isLastSentence, isStopped);
    }
    /** MODE REWRITE step-1: pecah teks tiap blok anak jadi daftar kalimat lalu kosongkan layarnya */
    static _extractRewriteBlocks(originalChildren) {
        // @ts-ignore
        const sentenceSegmenter = new Intl.Segmenter(document.documentElement.lang || 'id', { granularity: 'sentence' });
        // Ekstraksi data kalimat dari elemen anak asli tanpa merusak tag visualnya
        return originalChildren.map(child => {
            const rawText = (child.textContent || '').trim().replace(/\s+/g, ' ');
            const sentences = [...sentenceSegmenter.segment(rawText)].map(s => s.segment.trim()).filter(Boolean);
            child.textContent = ''; // Kosongkan tampilan awal layar secara sinkronus
            child.style.visibility = "hidden";
            return { el: child, sentences };
        });
    }
    /** MODE REWRITE step-2: satu lintasan penuh — tampilkan blok bergantian sambil mengetik kalimatnya */
    static async _rewritePass(node, blockData, options, isStopped = () => false) {
        for (const block of blockData) {
            block.el.style.display = ''; // Tampilkan elemen pembungkus asli saat gilirannya tiba
            block.el.style.visibility = "visible";
            for (let sIndex = 0; sIndex < block.sentences.length; sIndex++) {
                if (!node.isConnected || isStopped())
                    return;
                // Cari tahu apakah ini kalimat paling akhir dari seluruh tumpukan skema JSON
                const isLastBlock = block === blockData[blockData.length - 1];
                const isLastSentenceOfBlock = sIndex === block.sentences.length - 1;
                const isAbsoluteLast = isLastBlock && isLastSentenceOfBlock;
                // Jalankan pengetikan terpusat secara sekuensial murni
                await this._typewriterEffect(node, block.el, block.sentences[sIndex], options, isAbsoluteLast, isStopped);
            }
            // Sembunyikan elemen lama agar tidak meninggalkan ruang kosong sebelum elemen berikutnya muncul
            if (block !== blockData[blockData.length - 1] || options.loop) {
                block.el.style.display = 'none';
            }
        }
    }
    /**
     * SCENARIO A ENGINE — MODE REWRITE (Mendukung Struktur Bersarang Komponen Skema Anda):
     * sekali jalan, atau berputar tanpa henti selama opsi loop aktif.
     */
    static async _rewriteEngine(node, options, onDone, isStopped = () => false) {
        const childElements = [...Array.from(node.children)];
        const originalChildren = childElements.length > 0 ? childElements : [node];
        const blockData = this._extractRewriteBlocks(originalChildren);
        if (options.loop) {
            while (true) {
                if (!node.isConnected || isStopped())
                    break;
                await this._rewritePass(node, blockData, options, isStopped);
            }
        }
        else {
            await this._rewritePass(node, blockData, options, isStopped);
            onDone();
        }
    }
    /**
     * SCENARIO B ENGINE — LOOP MULTI-ELEMENT (Berdasarkan Array Teks):
     * seluruh teks anak digabung menjadi satu paragraf dinamis lalu diputar terus.
     */
    static async _loopMultiElement(node, options, isStopped = () => false) {
        const childElements = [...Array.from(node.children)];
        const loopTexts = childElements.map(el => el.textContent || '');
        const firstChild = node.firstElementChild;
        const loopParagraphTag = firstChild ? firstChild.tagName.toLowerCase() : 'p';
        while (node.firstChild)
            node.removeChild(node.firstChild);
        const loopParagraph = document.createElement(loopParagraphTag);
        node.appendChild(loopParagraph);
        while (true) {
            if (!node.isConnected || isStopped())
                break;
            for (const text of loopTexts) {
                if (!node.isConnected || isStopped())
                    break;
                // Gunakan fungsi utama: loop mode selalu menghapus mundur di akhir kalimat
                await this._typewriterEffect(node, loopParagraph, text, options, false, isStopped);
            }
        }
    }
    /** True bila elemen hanya memuat satu anak bertipe Text murni */
    static _hasSingleTextNode(el) {
        return el.childNodes.length === 1 && el.childNodes[0].nodeType === Node.TEXT_NODE;
    }
    /**
     * SCENARIO C ENGINE — SEKUENSIAL / PARALEL DEFAULT (Sekali Jalan Tanpa Rewrite):
     * teks setiap elemen anak diketik bergantian dari atas ke bawah.
     */
    static async _runSequential(node, options, onDone, isStopped = () => false) {
        const childElements = [...Array.from(node.children)];
        const sequentialData = childElements.map(el => {
            const text = el.textContent || '';
            el.textContent = '';
            return { el, text };
        });
        for (let i = 0; i < sequentialData.length; i++) {
            if (!node.isConnected || isStopped())
                return;
            const item = sequentialData[i];
            // isLastSentence SELALU true: mode sekuensial adalah sekali jalan TANPA
            // rewrite — setiap baris dipertahankan setelah selesai diketik, bukan
            // dihapus mundur seperti pada mode rewrite/loop.
            item.el.textContent = item.text;
            await this._typewriterEffect(node, item.el, item.text, options, true, isStopped);
        }
        onDone();
    }
    /**
     * Router utama untuk memproses efek typewriter pada DOM Node.
     * Port 1:1 dari AnimationsService._handleTypewriter (versi lama).
     */
    static async animate(node, baseOptions, onDone, 
    /**
     * 🧯 Sinyal pemberhentian eksternal dari AnimationsService registry:
     * destroy(), penimpaan rantai oleh re-trigger (init ulang setiap navigasi),
     * atau pelepasan node. Digabung dengan pengecekan isConnected di SETIAP
     * titik tunggu sehingga rantai — termasuk while(true) mode loop —
     * benar-benar mati, bukan menumpuk selamanya (sumber memory leak lama).
     */
    isStopped = () => false) {
        // =========================================================================
        // RESOLUSI OPSI EFEKTIF (Override atribut HTML, identik dgn _handleTypewriter lama)
        // =========================================================================
        let loop = baseOptions.loop;
        if (node.hasAttribute('data-tw-loop')) {
            const attr = node.getAttribute('data-tw-loop');
            if (attr === 'true')
                loop = true;
            else if (attr === 'false')
                loop = false;
            else {
                const num = parseInt(attr || '', 10);
                loop = isNaN(num) ? false : num;
            }
        }
        const rewrite = node.hasAttribute('data-tw-rewrite')
            ? node.getAttribute('data-tw-rewrite') === 'true'
            : baseOptions.rewrite;
        const options = { ...baseOptions, loop, rewrite };
        // =========================================================================
        // 🚧 LAYOUT SHIFT — KETERBATASAN DESAIN SAAT INI (TODO: FIX PERMANEN):
        // Teks diketik runtime (`textContent += char`) mengubah tinggi kotak
        // secara alami, sehingga konten di bawahnya ikut bergeser selama mengetik.
        // Percobaan reservasi `min-height` (ukur tinggi penuh sebelum wipe →
        // kunci → lepas saat done untuk rewrite) sudah DITARIK, karena:
        //   1. Konten panjang (mis. ConfirmationSet) memegang area kosong besar
        //      selama paragraf-paragraf awal mengetik — terlihat buruk.
        //   2. Mode rewrite: konten akhir (blok terakhir) lebih pendek daripada
        //      tinggi terukur — pelepasan reservasi di done justru memicu
        //      layout jump baru di posisi yang salah.
        // Ide fix permanen: ketik ke dalam klon "sizer" tersembunyi lalu tukar,
        // grid baris terukur per-baris, atau menunggu CSS `interpolate-size` —
        // apapun yang mengetik TANPA mengubah tinggi kotak sampai selesai.
        // =========================================================================
        // 👁️ Buka visibility inline (mengalahkan pre-hide `visibility: hidden`
        // dari Animations.css yang mencegah kilatan teks penuh saat node baru
        // terpasang / langkah multistep aktif / chain masih menunggu giliran).
        // Harus satu task dengan mulainya ketikan agar tidak ada frame yang
        // menampilkan konten setengah siap.
        node.style.visibility = 'visible';
        // =========================================================================
        // ROUTER STRUKTUR JALUR DOM (logika inti sudah diekstrak ke helper method)
        // =========================================================================
        // 1. SCENARIO A: MODE REWRITE (Mendukung Struktur Bersarang Komponen Skema Anda)
        if (options.rewrite) {
            await this._rewriteEngine(node, options, onDone, isStopped);
            return;
        }
        // 2. SCENARIO B: LOOP MULTI-ELEMENT (Berdasarkan Array Teks)
        if (options.loop) {
            await this._loopMultiElement(node, options, isStopped);
            return;
        }
        // 3. SCENARIO C: SEKUENSIAL / PARALEL DEFAULT (Sekali Jalan Tanpa Rewrite)
        if (this._hasSingleTextNode(node) || node.children.length === 0) {
            // Teks tunggal murni
            await this._typewriterEffect(node, node, node.textContent || '', options, true, isStopped);
            onDone();
        }
        else {
            // Beruntun sekuensial per baris elemen anak
            await this._runSequential(node, options, onDone, isStopped);
        }
    }
}
/** `animation="typewriter"` — typing engine with rewrite and loop scenarios. */
export const typewriterBehaviour = {
    type: 'typewriter',
    // `delay` is resolved per node by the engine (`data-delay` > global default),
    // so it always wins over whatever the config block carries.
    animate: ({ node, options, delay, stopped, done }) => TypewriterBehaviour.animate(node, { ...options, delay }, () => done(), stopped),
};
//# sourceMappingURL=typewriter.js.map