export class GravitySimulation {
    container;
    config;
    isRunning;
    animationFrameId;
    particles;
    mouse;
    draggedParticle;
    readyToDragParticle;
    dragOffset;
    shockFrames;
    _boundOnMouseMove;
    _boundOnMouseLeave;
    _boundOnMouseUp;
    constructor(container, customConfig = {}) {
        // ERROR HANDLING: Pastikan container adalah elemen DOM yang valid
        if (!(container instanceof HTMLElement)) {
            throw new Error("GravitySimulation: Container harus berupa HTMLElement yang valid.");
        }
        this.container = container;
        const defaultConfig = {
            // === 1. FONDASI FISIKA DAN FLUIDA (CORE SIMULATION) ===
            gravityForce: -0.65, // Gaya angkat melayang konstan ke atas setelah fase kejutan awal selesai (nilai minus = terbang).
            springStiffness: 0.018, // Kekencangan tali karet elastis ke posisi semula. Nilai kecil (0.018) membuat tali melar sehingga elemen bisa melambung tinggi.
            airResistance: 0.85, // Hambatan/gesekan udara standar (Damping). Berfungsi sebagai bantalan tebal agar elemen tidak terus bergerak liar dan cepat stabil.
            // === 2. INTERAKSI CLOTH / DESAKAN ANTAR ELEMEN (DOMINO EFFECT) ===
            repulsionForce: 2.5, // Faktor pengali kekuatan desakan antar-elemen saat mereka saling bertabrak secara fisik.
            repulsionRadius: 0.9, // Skala sensitivitas perimeter kotak elemen. Mengatur seberapa dekat elemen harus menempel sebelum gaya desak aktif.
            // === 3. INTERAKSI DENGAN KURSOR MOUSE ===
            mouseForce: 1.2, // Kekuatan dorongan kursor mouse saat menyenggol elemen UI (nilai kecil = lembut seperti menyibak air).
            mousePadding: 5, // Jarak toleransi (dalam piksel) dari luar kotak fisik elemen untuk mulai memicu deteksi sentuhan mouse yang presisi.
            // === 4. SISTEM ANGIN TURBULENSI (CONSTANT WIND SYSTEM) ===
            windSpeed: 0.02, // Kecepatan perubahan arah hembusan angin konstan (frekuensi perubahan pola ayunan).
            windMagnitude: 0.2, // Kekuatan atau lebar dorongan angin dasar yang mengayun elemen secara konstan.
            // === 5. FISIKA KEMIRINGAN DINAMIS (DYNAMIC TILT EFFECT) ===
            tiltSensitivity: 0.2, // Sensitivitas kemiringan elemen saat bergerak horizontal atau didorong (makin besar = makin miring mengikuti inersia kecepatan).
            tiltMax: 2, // Batas maksimal kemiringan dinamis yang diizinkan (dalam satuan derajat/degree) agar rotasi tidak terlalu ekstrem.
            tiltReturnSpeed: 0.5, // Kecepatan elemen untuk tegak kembali ke posisi semula (kembali ke resting tilt) saat elemen mulai diam tidak bergerak.
            tiltRandomRange: 6, // Batas maksimal sudut kemiringan konstan bawaan (Resting Tilt) acak yang didapat elemen sejak inisialisasi agar terkesan berat sebelah.
            // === 6. BATAS PERIMETER KANVAS (BOUNDARY HANDLING) ===
            boundaryPadding: 12, // Jarak aman minimal (dalam piksel) di sisi dalam dinding kontainer agar elemen UI tidak menabrak mepet ke garis tepi luar.
            // === 7. SIKLUS PENGACAK INSTANCE (VARIATION CONTROL) ===
            randomize: true, // Mengaktifkan fitur pemisah fase waktu dan pengacak kekuatan individual agar gerakan melayang tiap elemen tidak seragam/monoton.
            selectors: {
                "@container": { className: "antigravity" },
                "@item": { className: "no-mass" },
                "@item:active": { className: "hovering" },
                "@excludes": [".skip-me"],
            },
            // === 8. EKSTERNAL INJEKSI ===
            ...customConfig // Memungkinkan penimpaan nilai config di atas secara fleksibel saat melakukan "new GravitySimulation()" dari luar.
        };
        this.config = Object.assign({}, defaultConfig, customConfig);
        this.isRunning = false;
        this.animationFrameId = null;
        this.particles = [];
        this.mouse = { x: -1000, y: -1000 };
        this.draggedParticle = null;
        this.readyToDragParticle = null;
        this.dragOffset = { x: 0, y: 0 };
        this.shockFrames = 0;
        // Bersihkan fungsi binding agar aman saat destroy
        this._boundOnMouseMove = this._onMouseMove.bind(this);
        this._boundOnMouseLeave = this._onMouseLeave.bind(this);
        this._boundOnMouseUp = this._onMouseUp.bind(this);
        this.init();
    }
    init() {
        try {
            const itemClass = this.config.selectors["@item"]?.className || "";
            // Ambil array pengecualian dari config
            const excludesArray = this.config.selectors["@excludes"] || [];
            // Gabungkan array menjadi satu string CSS selector (misal: "button, .skip-me, #ignore-id")
            const excludesSelector = excludesArray.join(", ");
            // GUARD LEVEL-1: Hanya mengambil direct children, aman dari nested elements
            const items = this.container?.children;
            this.container?.addEventListener("mousemove", this._boundOnMouseMove);
            this.container?.addEventListener("mouseleave", this._boundOnMouseLeave);
            window.addEventListener("mouseup", this._boundOnMouseUp);
            Array.from(items).forEach((item) => {
                if (item.tagName === "SCRIPT" || item.tagName === "STYLE")
                    return;
                // 2. EXCLUDES GUARD: Cek secara dinamis menggunakan .matches()
                // Jika elemen cocok dengan salah satu selektor di array @excludes, langsung lewati!
                if (excludesSelector && item.matches(excludesSelector))
                    return;
                if (itemClass) {
                    const tokens = itemClass.split(" ").filter((t) => t.trim() !== "");
                    item.classList.add(...tokens);
                }
                const pData = {
                    element: item,
                    // FISIKA DELTA: Kita tidak mengukur koordinat absolut, melainkan seberapa jauh
                    // elemen bergeser dari posisi layout aslinya (dimulai dari 0,0)
                    id: Math.random().toString(36).substring(2, 9),
                    offsetX: 0,
                    offsetY: 0,
                    vx: 0,
                    vy: 0,
                    width: 0,
                    height: 0,
                    seedX: this.config.randomize ? Math.random() * 5000 : 0,
                    seedY: this.config.randomize ? Math.random() * 5000 : 1000,
                    windSpeedMod: this.config.randomize ? 0.4 + Math.random() * 0.8 : 1,
                    windMagMod: this.config.randomize ? 0.6 + Math.random() * 1.2 : 1,
                    restingTilt: this.config.randomize
                        ? Math.random() * this.config.tiltRandomRange * 2 - this.config.tiltRandomRange
                        : 0,
                    currentTilt: 0,
                    _mouseDownHandler: (e) => {
                        if (!this.isRunning)
                            return;
                        // Offset drag dihitung dari koordinat mouse lokal terhadap posisi pergeseran partikel saat ini
                        this.dragOffset = {
                            x: this.mouse.x - pData.offsetX,
                            y: this.mouse.y - pData.offsetY,
                        };
                        this.readyToDragParticle = pData;
                        e.preventDefault();
                    },
                };
                item.addEventListener("mousedown", pData._mouseDownHandler);
                this.particles.push(pData);
            });
        }
        catch (error) {
            console.error("GravitySimulation: Gagal melakukan inisialisasi.", error);
        }
    }
    _onMouseMove(e) {
        if (!this.isRunning)
            return; // Guard agar tidak menghitung koordinat jika sedang mati
        const rect = this.container?.getBoundingClientRect();
        this.mouse.x = e.clientX - rect.left;
        this.mouse.y = e.clientY - rect.top;
        if (this.readyToDragParticle && !this.draggedParticle) {
            this.draggedParticle = this.readyToDragParticle;
            this.readyToDragParticle = null;
        }
    }
    _onMouseLeave() {
        this.mouse = { x: -1000, y: -1000 };
    }
    _onMouseUp() {
        this.draggedParticle = null;
        this.readyToDragParticle = null;
    }
    run() {
        // GUARD 1: Jika engine sudah berjalan, abaikan panggilan berulang (Cegah Duplicate Loops)
        if (this.isRunning)
            return;
        // GUARD 2: Jika container sudah tidak ada di DOM, batalkan operasi
        if (!this.container || !this.container.isConnected)
            return;
        this.isRunning = true;
        this.shockFrames = 50;
        const containerClass = this.config.selectors["@container"]?.className || "";
        if (containerClass) {
            const tokens = containerClass.split(" ").filter((t) => t.trim() !== "");
            this.container.classList.add(...tokens);
        }
        const activeClass = this.config.selectors["@item:active"]?.className || "physics-active";
        const activeTokens = activeClass.split(" ").filter((t) => t.trim() !== "");
        this.particles.forEach((p) => {
            // Pastikan elemen masih ada di DOM saat dijalankan
            if (!p.element.isConnected)
                return;
            const rect = p.element.getBoundingClientRect();
            p.width = rect.width;
            p.height = rect.height;
            // Reset awal pergeseran
            p.offsetX = 0;
            p.offsetY = 0;
            p.element.classList.add(...activeTokens);
            // Hentakan ke atas secara sinematik
            p.vy = -38 - Math.random() * 8;
            p.vx = Math.random() * 12 - 6;
        });
        this.loop();
    }
    stop() {
        // GUARD: Jika engine sudah mati, abaikan panggilan stop berulang
        if (!this.isRunning)
            return;
        this.isRunning = false;
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null; // Hapus referensi ID loop total
        }
        const containerClass = this.config.selectors["@container"]?.className || "";
        if (containerClass) {
            const tokens = containerClass.split(" ").filter((t) => t.trim() !== "");
            this.container?.classList.remove(...tokens);
        }
        const activeClass = this.config.selectors["@item:active"]?.className || "physics-active";
        const activeTokens = activeClass.split(" ").filter((t) => t.trim() !== "");
        this.particles.forEach((p) => {
            // Jika elemen sudah dihapus oleh framework luar (SPA), lewati pembersihan style
            if (!p.element.isConnected)
                return;
            p.element.classList.remove(...activeTokens);
            // ANIMASI PULANG UNIVERSAL: Kita paksa Delta koordinat (offsetX/Y) meluncur kembali ke 0
            p.element.style.transition = "transform 0.6s cubic-bezier(0.25, 1, 0.5, 1), background 0.3s";
            p.element.style.transform = `translate3d(0px, 0px, 0) rotateZ(0deg)`;
            const onTransitionEnd = () => {
                p.element.removeEventListener("transitionend", onTransitionEnd);
                if (this.isRunning)
                    return;
                // Bersihkan total inline style, otomatis elemen patuh pada layout CSS bawaannya (Flex/Grid/Standard)
                p.element.style.transform = "";
                p.element.style.transition = "";
                p.offsetX = 0;
                p.offsetY = 0;
                p.vx = 0;
                p.vy = 0;
                p.currentTilt = 0;
            };
            p.element.addEventListener("transitionend", onTransitionEnd);
        });
    }
    destroy() {
        this.stop();
        if (this.container) {
            this.container.removeEventListener("mousemove", this._boundOnMouseMove);
            this.container.removeEventListener("mouseleave", this._boundOnMouseLeave);
        }
        window.removeEventListener("mouseup", this._boundOnMouseUp);
        const itemTokens = this.config.selectors["@item"].className.split(" ").filter((t) => t.trim() !== "");
        this.particles.forEach((p) => {
            p.element.removeEventListener("mousedown", p._mouseDownHandler);
            // Bersihkan class dan style hanya jika element-nya masih ada di DOM
            if (p.element.isConnected) {
                if (itemTokens.length)
                    p.element.classList.remove(...itemTokens);
                p.element.style.transform = "";
                p.element.style.transition = "";
            }
        });
        // Pelepasan referensi penuh ke memori kosong (Garbage Collector Target)
        this.particles = [];
        this.container = null;
        this.draggedParticle = null;
        this.readyToDragParticle = null;
    }
    loop() {
        // SECURE LOOP GUARD: Hentikan loop seketika jika isRunning diset false
        if (!this.isRunning)
            return;
        // SAFETY INSTANCE GUARD: Jika kontainer induk mendadak hilang dari DOM tree
        if (!this.container || !this.container.isConnected) {
            this.destroy();
            return;
        }
        const parentW = this.container.clientWidth || 1; // Cegah pembagian dengan angka 0
        const parentH = this.container.clientHeight || 1;
        // AUTO-EVICTION FILTER: Hapus partikel dari array jika elemen fisiknya dicabut dari DOM saat loop berjalan
        this.particles = this.particles.filter((p) => {
            if (!p.element.isConnected) {
                p.element.removeEventListener("mousedown", p._mouseDownHandler); // Cabut listener agar memory leak bebas
                return false; // Keluarkan dari memori engine
            }
            return true;
        });
        // A. CLOTH SIMULATION (Deteksi Rect Collision Berbasis Koordinat Relatif terhadap Awal)
        for (let i = 0; i < this.particles.length; i++) {
            for (let j = i + 1; j < this.particles.length; j++) {
                const p1 = this.particles[i];
                const p2 = this.particles[j];
                // Dapatkan posisi absolut lokal saat ini di dalam container
                const p1Left = p1.element.offsetLeft + p1.offsetX;
                const p1Right = p1Left + p1.width;
                const p1Top = p1.element.offsetTop + p1.offsetY;
                const p1Bottom = p1Top + p1.height;
                const p2Left = p2.element.offsetLeft + p2.offsetX;
                const p2Right = p2Left + p2.width;
                const p2Top = p2.element.offsetTop + p2.offsetY;
                const p2Bottom = p2Top + p2.height;
                const tolerance = this.config.mousePadding || 2;
                const isColliding = p1Left - tolerance < p2Right &&
                    p1Right + tolerance > p2Left &&
                    p1Top - tolerance < p2Bottom &&
                    p1Bottom + tolerance > p2Top;
                if (!isColliding)
                    continue;
                const overlapX = Math.min(p1Right - p2Left, p2Right - p1Left);
                const overlapY = Math.min(p1Bottom - p2Top, p2Bottom - p1Top);
                let nx = 0;
                let ny = 0;
                let overlap = 0;
                if (overlapX < overlapY) {
                    overlap = overlapX;
                    nx = p1Left < p2Left ? 1 : -1;
                }
                else {
                    overlap = overlapY;
                    ny = p1Top < p2Top ? 1 : -1;
                }
                const rvx = p2.vx - p1.vx;
                const rvy = p2.vy - p1.vy;
                const velAlongNormal = rvx * nx + rvy * ny;
                let elasticityFactor = 0.12;
                if (velAlongNormal < 0) {
                    elasticityFactor += Math.abs(velAlongNormal) * 0.05;
                }
                elasticityFactor = Math.min(elasticityFactor, 0.45);
                const displacementX = nx * overlap * elasticityFactor;
                const displacementY = ny * overlap * elasticityFactor;
                if (p1 !== this.draggedParticle) {
                    p1.offsetX -= displacementX;
                    p1.offsetY -= displacementY;
                    p1.vx -= displacementX * 0.15;
                    p1.vy -= displacementY * 0.15;
                }
                if (p2 !== this.draggedParticle) {
                    p2.offsetX += displacementX;
                    p2.offsetY += displacementY;
                    p2.vx += displacementX * 0.15;
                    p2.vy += displacementY * 0.15;
                }
            }
        }
        // B. INDIVIDU DYNAMICS W/ DYNAMIC RESISTANCE
        this.particles.forEach((p) => {
            // Posisi absolut lokal elemen saat ini untuk deteksi batas & kursor mouse
            const currentAbsoluteX = p.element.offsetLeft + p.offsetX;
            const currentAbsoluteY = p.element.offsetTop + p.offsetY;
            if (p === this.draggedParticle) {
                const targetOffsetX = this.mouse.x - this.dragOffset.x;
                const targetOffsetY = this.mouse.y - this.dragOffset.y;
                p.vx = (targetOffsetX - p.offsetX) * 0.4;
                p.vy = (targetOffsetY - p.offsetY) * 0.4;
                p.offsetX = targetOffsetX;
                p.offsetY = targetOffsetY;
                const targetTilt = p.vx * this.config.tiltSensitivity * 2.5;
                p.currentTilt += (targetTilt - p.currentTilt) * 0.2;
            }
            else if (p === this.readyToDragParticle) {
                p.seedX += this.config.windSpeed * p.windSpeedMod;
                p.seedY += this.config.windSpeed * p.windSpeedMod;
                p.vx += Math.sin(p.seedX) * (this.config.windMagnitude * p.windMagMod);
                p.vx *= 0.8;
                p.vy *= 0.8;
                p.offsetX += p.vx;
                p.offsetY += p.vy;
                p.currentTilt += (p.restingTilt - p.currentTilt) * this.config.tiltReturnSpeed;
            }
            else {
                // 1. Turbulensi Angin
                p.seedX += this.config.windSpeed * p.windSpeedMod;
                p.seedY += this.config.windSpeed * p.windSpeedMod * 0.85;
                const windX = (Math.sin(p.seedX) + Math.sin(p.seedX * 2.3)) * 0.5 * (this.config.windMagnitude * p.windMagMod);
                const windY = (Math.cos(p.seedY) + Math.sin(p.seedY * 1.7)) * 0.5 * (this.config.windMagnitude * p.windMagMod);
                p.vx += windX;
                p.vy += this.config.gravityForce + windY;
                // 2. Gaya Tarik Pegas Elastis (Kembali ke koordinat Delta 0,0)
                p.vx += (0 - p.offsetX) * this.config.springStiffness;
                p.vy += (0 - p.offsetY) * this.config.springStiffness;
                // 3. Deteksi Presisi Kursor Mouse
                const padMouse = this.config.mousePadding;
                const insideX = this.mouse.x >= currentAbsoluteX - padMouse && this.mouse.x <= currentAbsoluteX + p.width + padMouse;
                const insideY = this.mouse.y >= currentAbsoluteY - padMouse && this.mouse.y <= currentAbsoluteY + p.height + padMouse;
                if (insideX && insideY) {
                    const itemCx = currentAbsoluteX + p.width / 2;
                    const itemCy = currentAbsoluteY + p.height / 2;
                    const mDx = itemCx - this.mouse.x;
                    const mDy = itemCy - this.mouse.y;
                    const mDist = Math.sqrt(mDx * mDx + mDy * mDy) || 1;
                    p.vx += (mDx / mDist) * this.config.mouseForce * 0.18;
                    p.vy += (mDy / mDist) * this.config.mouseForce * 0.18;
                }
                // Hambatan Udara Dinamis (Shock Wave Delay & Drop EFFECT)
                let currentAirResistance = this.config.airResistance;
                if (this.shockFrames > 0) {
                    if (this.shockFrames > 25)
                        currentAirResistance = 0.72; // Delay diam
                    else
                        currentAirResistance = 0.96; // Drop cepat
                }
                p.vx *= currentAirResistance;
                p.vy *= currentAirResistance;
                p.offsetX += p.vx;
                p.offsetY += p.vy;
                // 4. Pembatasan Dinding Kontainer Induk
                const bPad = this.config.boundaryPadding;
                if (currentAbsoluteX < bPad) {
                    p.offsetX = bPad - p.element.offsetLeft;
                    p.vx = 0;
                }
                if (currentAbsoluteX + p.width > parentW - bPad) {
                    p.offsetX = parentW - bPad - p.width - p.element.offsetLeft;
                    p.vx = 0;
                }
                if (currentAbsoluteY < bPad) {
                    p.offsetY = bPad - p.element.offsetTop;
                    p.vy = 0;
                }
                if (currentAbsoluteY + p.height > parentH - bPad) {
                    p.offsetY = parentH - bPad - p.height - p.element.offsetTop;
                    p.vy = 0;
                }
                // 5. Kalkulasi Kemiringan (Tilt)
                const dynamicTilt = p.vx * this.config.tiltSensitivity * 10;
                const clampedTilt = Math.max(-this.config.tiltMax, Math.min(this.config.tiltMax, p.restingTilt + dynamicTilt));
                p.currentTilt += (clampedTilt - p.currentTilt) * 0.15;
            }
            // Render murni menggunakan pergeseran matriks Delta berbasis transform, struktur asli aman!
            p.element.style.transform = `translate3d(${p.offsetX.toFixed(2)}px, ${p.offsetY.toFixed(2)}px, 0) rotateZ(${p.currentTilt.toFixed(2)}deg)`;
        });
        if (this.shockFrames > 0)
            this.shockFrames--;
        // Perbarui referensi ID loop
        this.animationFrameId = requestAnimationFrame(() => this.loop());
    }
}
export function runSimulation() {
    const style = `
     body {
        margin: 0;
        font-family: system-ui, sans-serif;
        background: #0f1015;
        color: #fff;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        overflow: hidden;
      }

      .controls {
        display: flex;
        gap: 10px;
        margin-bottom: 20px;
      }

      .btn-gravity {
        padding: 12px 24px;
        font-size: 16px;
        font-weight: bold;
        background: #ff4757;
        color: white;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        z-index: 10;
        transition: background 0.3s;
      }

      .btn-danger {
        background: #747d8c;
      }

      .dashboard {
        display: flex;
        gap: 20px;
      }

      #containerA {
        display: flex;
        justify-content: center;
        gap: 2em;
        align-items: center;
        position: relative;
        width: 450px;
        height: 400px;
        background: #16171e;
        border: 2px dashed #333;
        border-radius: 16px;
        padding: 15px;
      }

      .object {
        background: #232731;
        padding: 15px 25px;
        border-radius: 10px;
        border-left: 5px solid #ff4757;
        user-select: none;
        font-weight: 600;
        white-space: nowrap;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        transition:
          transform 0s,
          background 0.3s;
      }

      .no-mass {
        position: initial;
        left: initial;
        top: initial;
        transform: translate3d(0px, 0px, 0) rotateZ(0deg);
      }

      .hovering {
        cursor: grab;
      }

      .hovering:active {
        cursor: grabbing;
      }
  `;
    const test_template = `
    <style>${style}</style>
     <div class="controls">
      <button class="btn-gravity" id="toggleBtn">Kill the Gravity 🚀</button>
      <button class="btn-gravity btn-danger" id="destroyBtn">Nuke/Destroy Simulation 💥</button>
    </div>

    <div class="dashboard">
      <div id="containerA">
        <div class="object">🛍️ Cart Items</div>
        <div class="object">💳 Checkout</div>
        <div class="object">💳 Burik</div>
        <div class="object">💳 Ketho</div>
      </div>
    </div>
  `;
    document.body.insertAdjacentHTML("afterbegin", test_template);
    let simA = new GravitySimulation(document.getElementById("containerA"));
    let active = false;
    const toggleBtn = document.getElementById("toggleBtn");
    const destroyBtn = document.getElementById("destroyBtn");
    toggleBtn?.addEventListener("click", () => {
        if (!simA)
            return alert("Simulation sudah dihancurkan. Silakan refresh halaman.");
        active = !active;
        if (active) {
            toggleBtn.textContent = "Turn Gravity Back On 🔄";
            toggleBtn.style.background = "#1e90ff";
            simA.run();
        }
        else {
            toggleBtn.textContent = "Kill the Gravity 🚀";
            toggleBtn.style.background = "#ff4757";
            simA.stop();
        }
    });
    // Uji coba tombol destroy
    destroyBtn?.addEventListener("click", () => {
        if (simA) {
            simA.destroy();
            simA = null; // Lepas object reference penuh agar Garbage Collector langsung bekerja
            alert("Simulation destroyed! Semua listener telah dicabut dan element kembali ke HTML statis awal.");
        }
    });
}
runSimulation();
//# sourceMappingURL=gravity-simulation.js.map