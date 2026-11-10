# Dokumentasi Referensi: Google Apps Script & Integrasi Gemini API

Dokumen ini berisi rangkuman teknis, arsitektur kode, dan solusi optimal terkait otomatisasi Google Apps Script (GAS) dan integrasinya dengan AI Google (Gemini 2.5 Flash).

---

```text
       [Client Browser Request / Webhook]
                       │
                       ▼
             [Orchestrator GATE]
        (Akun Utama / Master Logging)
                       │
        ┌──────────────┼──────────────┐  ➔ (Pilih Runner secara Round-Robin
        ▼              ▼              ▼     atau berdasarkan sisa kuota log)
   [Runner 1]     [Runner 2]     [Runner 3]
  (Akun Gmail 1) (Akun Gmail 2) (Akun Gmail 3)
        │              │              │
        └──────────────┬──────────────┘
                       ▼
         [Eksekusi Copy / Gemini / Git]

```

```json
{
  "hero_eyebrow": "Private Trip Keluarga • Kepulauan Seribu",
  "hero_title": "Liburan laut yang tenang dan privat.",
  "hero_desc": "Kami menyusun perjalanan keluarga ke pulau impian dengan itinerary yang jelas...",
  "stats_section_title": "Keunggulan perusahaan",
  "about_title": "Operator lokal resmi yang menggabungkan kenyamanan.",
  "about_desc": "Kami merancang setiap trip dengan memperhatikan kebutuhan keluarga..."
}
```

## 1. Duplikasi File Google Sheets via Spreadsheet ID

Untuk menyalin (_copy_) file Google Sheets secara mandiri tanpa perlu membukanya secara aktif di layar, gunakan kombinasi `DriveApp` dan `Spreadsheet ID`.

### Kode Apps Script (Siap Pakai)

```javascript
function salinSpreadsheetViaId() {
  const fileId = "MASUKKAN_SPREADSHEET_ID_DI_SINI"; // Ambil dari URL file asal
  const folderId = "MASUKKAN_FOLDER_ID_DI_SINI"; // Opsional: ID Folder tujuan di Drive

  // 1. Akses file asal berdasarkan ID
  const fileAsal = DriveApp.getFileById(fileId);
  const namaFileBaru = "Salinan Otomatis - " + fileAsal.getName();

  // 2. Proses penyalinan (bisa langsung diarahkan ke folder spesifik)
  let fileBaru;
  if (folderId) {
    const folderTujuan = DriveApp.getFolderById(folderId);
    fileBaru = fileAsal.makeCopy(namaFileBaru, folderTujuan);
  } else {
    fileBaru = fileAsal.makeCopy(namaFileBaru); // Masuk ke root My Drive
  }

  Logger.log("File sukses disalin! URL: " + fileBaru.getUrl());
}
```

---

## 2. Arsitektur Integrasi Gemini API di Apps Script

Google Apps Script **tidak memiliki namespace bawaan** (seperti `GeminiApp`). Komunikasi wajib dilakukan via REST API menggunakan `UrlFetchApp.fetch()`.

### Mengapa menggunakan `UrlFetchApp`?

- **Fleksibilitas Versi**: Memudahkan pergantian model (misal dari `gemini-1.5` ke `gemini-2.5-flash`) secara instan.
- **Isolasi Infrastruktur**: Memisahkan logika internal Google Workspace dengan otentikasi Google Cloud Platform (API Key).

---

## 3. Web API Endpoint untuk Menerima Payload Client

Apps Script diubah menjadi Web App (API Endpoint) menggunakan fungsi native `doPost(e)`. Skrip ini menerima payload dari client, meneruskannya ke Gemini API, dan mengembalikan respons JSON.

### Kode Struktur Class & API Endpoint (`Code.gs`)

```javascript
const GEMINI_API_KEY = "MASUKKAN_API_KEY_GEMINI_ANDA";
// Endpoint resmi menggunakan model terbaru gemini-2.5-flash
const GEMINI_URL = `https://googleapis.com{GEMINI_API_KEY}`;

function doPost(e) {
  try {
    // 1. Ambil payload JSON dari client
    const clientPayload = JSON.parse(e.postData.contents);
    const userPrompt = clientPayload.prompt;

    if (!userPrompt) {
      return buildJsonResponse({ status: "error", message: "Missing 'prompt'" }, 400);
    }

    // 2. Susun payload standar sesuai dokumentasi Gemini API
    const geminiPayload = {
      contents: [{ parts: [{ text: userPrompt }] }],
    };

    // 3. Tembak ke Gemini API
    const options = {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(geminiPayload),
      muteHttpExceptions: true,
    };

    const response = UrlFetchApp.fetch(GEMINI_URL, options);
    const responseData = JSON.parse(response.getContentText());
    const aiText = responseData.candidates?.[0]?.content?.parts?.[0]?.text || "Gagal memproses teks.";

    // 4. Return respon ke client
    return buildJsonResponse({ status: "success", result: aiText });
  } catch (error) {
    return buildJsonResponse({ status: "error", message: error.toString() }, 500);
  }
}

// Helper untuk standarisasi output JSON di GAS
function buildJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}
```

---

## 4. Trik Sentralisasi Templat via Google AI Studio + Drive

REST API Gemini tidak mendukung pemanggilan langsung ID Prompt dari Google AI Studio. Namun, karena **setiap prompt yang di-save di Google AI Studio otomatis tersimpan sebagai file di Google Drive (Folder: `AI_Studio`)**, kita bisa menggunakannya sebagai CMS Templat Dinamis.

### Mekanisme Kerja:

1. Simpan templat kontrak di UI **Google AI Studio**, klik **Save**.
2. Buka **Google Drive**, temukan file tersebut di folder `AI_Studio`, lalu salin **File ID**-nya.
3. Apps Script membaca isi file mentah dari Drive secara _real-time_ sebelum digabungkan dengan data client.

### Kode Implementasi Otomatis (Multi-Templat Tanpa Hardcode)

```javascript
class GeminiContractGenerator {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.url = `https://googleapis.com{this.apiKey}`;
  }

  // Mengambil teks blueprint dari Google Drive secara real-time
  _readTemplateFromDrive(fileId) {
    const file = DriveApp.getFileById(fileId);
    return file.getBlob().getDataAsString();
  }

  generate(templateFileId, clientData) {
    const rawTemplate = this._readTemplateFromDrive(templateFileId);

    // Sistem instruksi mengunci perilaku AI agar patuh hukum dan kaku (tidak berhalusinasi)
    const systemInstruction =
      "Anda adalah pengacara korporat Indonesia. Buatkan kontrak resmi berdasarkan variabel data klien. WAJIB ikuti struktur template yang disediakan secara presisi.";

    const userPrompt = `
      Berikut data variabel klien (Format JSON):
      ${JSON.stringify(clientData)}
      
      Gunakan struktur template di bawah ini:
      ${rawTemplate}
    `;

    const payload = {
      contents: [{ parts: [{ text: userPrompt }] }],
      systemInstruction: { parts: [{ text: systemInstruction }] },
      generationConfig: {
        temperature: 0.2, // Nilai rendah agar AI patuh pada template dan tidak mengarang bebas
      },
    };

    const options = {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
    };

    const response = UrlFetchApp.fetch(this.url, options);
    const json = JSON.parse(response.getContentText());

    return json.candidates?.[0]?.content?.parts?.[0]?.text || "Gagal mengenerasi kontrak.";
  }
}
```

### Langkah Penting Deployment Apps Script sebagai Web API:

1. Klik **Deploy** > **New Deployment**.
2. Pilih jenis **Web App**.
3. Atur _Execute as_: **Me** (Akun Google Anda).
4. Atur _Who has access_: **Anyone** (Siapa saja, agar API bisa ditembak oleh client luar tanpa login Google).
5. Klik Deploy dan gunakan URL berakhiran `/exec`.

### Workflow

1. Saya Punya private apps script cms app dengan spreadsheedId = `some-id`,
   App ini terhubung langsung dengan apps script library saya dimana itu `engine auto generated CMS`
   spreadsheet file ini adalah target yang akan di duplicate setiap pembuatan cms baru.
2. Saya setup Client side app berisi form untuk user isi profil cms nya, hosted somewhere
   lalu ketika user submit harus diauthenticate via google auth dulu. kalau ada login baru beri access.
   tapi saya disini tidak mau memanage user, bisa kah via login with google?
3. apa sebaiknya saya buat 1 apps script endpoint lagi yang mengorchestrate semuanya,
   atau cukup dari target spreadheet x apps script library itu saja? untuk:
   - menerima request client
   - forward ke gemini
   - copy target spreadsheet. lalu post gemini generated content ke sheet tersebut
   - terima response dari target spreadsheet, lalu proses logging sedikit, dan kirim response jadi ke klien
4. Client mengenerate layout tampilan sesuai response server

# Alur Proses Arsitektur SaaS CMS Otomatis (Vertikal Flow)

Dokumen ini menjelaskan urutan langkah pembuatan akun CMS secara runtut dari atas ke bawah, mulai dari interaksi awal pengguna di halaman web hingga pemutusan hak akses server demi privasi data.

---

## 1. Diagram Alur Vertikal (Flowchart)

```text
       [ START: Pengguna Membuka Aplikasi Klien ]
                           │
                           ▼
          ┌──────────────────────────────────┐
          │     1. Login Akun via Google     │
          │  (Google Identity Services / GIS)│
          └──────────────────────────────────┘
                           │
                           ▼
          ┌──────────────────────────────────┐
          │  2. Google Mengembalikan Token   │
          │         Kredensial (JWT)         │
          └──────────────────────────────────┘
                           │
                           ▼
          ┌──────────────────────────────────┐
          │ 3. Pengguna Isi Form Profil CMS  │
          │   & Kirim Payload + JWT ke API   │
          └──────────────────────────────────┘
                           │
                           ▼
         [ PROSES SERVER: Orkestrator Berjalan ]
                           │
                           ▼
          ┌──────────────────────────────────┐
          │  4. Validasi Token (OIDC) ke     │
          │         Google Tokeninfo         │
          └──────────────────────────────────┘
                           │
                           ▼
          ┌──────────────────────────────────┐
          │   5. Ambil Templat AI Studio     │
          │      & Kirim ke Gemini API       │
          └──────────────────────────────────┘
                           │
                           ▼
          ┌──────────────────────────────────┐
          │  6. Terima Konten Hasil Generasi │
          │            dari Gemini           │
          └──────────────────────────────────┘
                           │
                           ▼
          ┌──────────────────────────────────┐
          │ 7. Duplikat Spreadsheet Master   │
          │      ke Drive Server Pusat       │
          └──────────────────────────────────┘
                           │
                           ▼
          ┌──────────────────────────────────┐
          │  8. Suntik Profil & Teks Gemini  │
          │     ke Sheet Baru (Tab Config)   │
          └──────────────────────────────────┘
                           │
                           ▼
          ┌──────────────────────────────────┐
          │ 9. Deploy Otomatis via Script API│
          │   (Menghasilkan Web App /exec)   │
          └──────────────────────────────────┘
                           │
                           ▼
          ┌──────────────────────────────────┐
          │ 10. Transfer Kepemilikan Utama   │
          │     File Spreadsheet ke Klien    │
          └──────────────────────────────────┘
                           │
                           ▼
          ┌──────────────────────────────────┐
          │ 11. Self-Detach: Hapus Akses     │
          │    Server Pusat dari File Klien  │
          └──────────────────────────────────┘
                           │
                           ▼
          ┌──────────────────────────────────┐
          │ 12. Kirim Response URL Web API   │
          │        (/exec) ke Klien          │
          └──────────────────────────────────┘
                           │
                           ▼
        [ END-PREVIEW: Klien Render Layout ]
                           │
                           ▼
 [ TRANSAKSI MASA DEPAN: CMS Engine Klien langsung ]
 [  menembak URL /exec Mandiri (Kuota Terpisah)    ]
```

---

## 2. Penjelasan Detail Setiap Tahapan Alur

### Tahap 1 & 2: Autentikasi Klien di Sisi Depan

Pengguna yang ingin membuat CMS diwajibkan melakukan masuk (_login_) menggunakan akun Google mereka melalui pustaka resmi Google Identity Services (GIS). Setelah berhasil, Google akan mengembalikan token enkripsi berbasis JWT (`id_token`) yang valid.

### Tahap 3 & 4: Submit Data & Proteksi Keamanan Backend

Pengguna mengisi form profil usaha mereka (Nama Brand, Deskripsi, dsb.). Ketika tombol _submit_ ditekan, aplikasi klien mengirimkan data form beserta `id_token` ke Apps Script Orkestrator Pusat. Orkestrator langsung memvalidasi token tersebut ke server Google API untuk memastikan identitas email pengguna tersebut 100% asli dan bukan hasil manipulasi.

### Tahap 5 & 6: Pembuatan Konten dengan Kunci Sistem Kaku

Orkestrator mengambil berkas templat perintah (_prompt template_) dari Google Drive (yang sebelumnya telah Anda rancang dan simpan di Google AI Studio). Data profil dari pengguna digabungkan ke dalam templat tersebut, lalu ditembak ke **Gemini 2.5 Flash API** dengan konfigurasi suhu rendah (`temperature: 0.2`) agar AI patuh pada format hukum/kontrak dan tidak mengarang teks bebas.

### Tahap 7 & 8: Duplikasi Basis Data & Penyuntikan Teks

File spreadsheet master (yang berisi pustaka _Engine Auto Generated CMS_ Anda) digandakan ke dalam Google Drive milik **akun Orkestrator (Operator)** terlebih dahulu. Mengapa di Drive Anda? Agar token internal Anda memiliki wewenang penuh untuk menulis data profil dan menyuntikkan hasil teks dari Gemini ke dalam sel tabel konfigurasi sheet baru tersebut tanpa terbentur masalah hak akses.

### Tahap 9: Automated Deployment (Menyalakan REST API Klien)

Karena file spreadsheet hasil duplikasi secara bawaan memiliki status Web App (`/exec`) yang mati, Orkestrator memanggil **Google Apps Script API** di balik layar. Skrip ini secara otomatis membuat versi proyek baru (_create version_) dan menerbitkannya sebagai Aplikasi Web operasional (_create deployment_) dengan hak akses `ANYONE` (Siapa saja). URL `/exec` unik untuk klien tersebut pun resmi tercipta.

### Tahap 10 & 11: Transfer Ownership & Self-Detach (Privasi Total)

Demi mematuhi aturan privasi data dan mencegah kuota server pusat Anda jebol di kemudian hari, langkah krusial ini dilakukan:

1. **Transfer Owner**: Email klien ditambahkan sebagai editor, lalu diangkat menjadi pemilik utama (_Owner_) file spreadsheet tersebut. File resmi berpindah ke Drive klien.
2. **Self-Detach**: Akun Orkestrator Anda menghapus dirinya sendiri dari daftar akses file tersebut (`removeEditor`). Hubungan server Anda dan file klien terputus total. Anda tidak bisa lagi mengintip data mereka, dan hal ini membebaskan Anda dari tuduhan manipulasi/penyadapan data (_data interception_).

### Tahap 12 & Masa Depan: Eksekusi Mandiri Tanpa Perantara

Orkestrator mengirimkan respons akhir berisi URL `/exec` baru tersebut kepada aplikasi klien untuk dirender menjadi visualisasi dasbor CMS. Untuk transaksi data atau perubahan konten di masa mendatang, CMS Engine klien akan langsung mengirimkan data **langsung ke URL /exec mandiri tersebut** tanpa lewat server pusat Anda lagi. Seluruh beban trafik dan kuota harian (`UrlFetchApp`) akan dibebankan secara adil pada akun masing-masing klien.

# Blueprint Kode Lengkap SaaS CMS: End-to-End Automation

Dokumen ini berisi seluruh implementasi fungsi teknis untuk sistem pembuatan CMS otomatis. Salin kode di bawah ini ke lingkungan kerja Anda masing-masing.

---

## 1. SISI KLIEN: Form & Google Authentication (`index.html`)

Masukkan Client ID dari Google Cloud Console pada atribut `data-client_id`.

```html
<!DOCTYPE html>
<html lang="id">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>CMS Auto-Generator Form</title>
    <script src="https://google.com" async defer></script>
    <style>
      body {
        font-family: sans-serif;
        max-width: 500px;
        margin: 50px auto;
        padding: 20px;
        border: 1px solid #ccc;
        border-radius: 8px;
      }
      .hidden {
        display: none;
      }
      .form-group {
        margin-bottom: 15px;
      }
      label {
        display: block;
        margin-bottom: 5px;
        font-weight: bold;
      }
      input,
      textarea {
        width: 100%;
        padding: 8px;
        box-sizing: border-box;
      }
      button {
        background-color: #007bff;
        color: white;
        border: none;
        padding: 10px 15px;
        cursor: pointer;
        border-radius: 4px;
      }
      button:disabled {
        background-color: #cccccc;
      }
      #statusMessage {
        margin-top: 15px;
        font-weight: bold;
      }
    </style>
  </head>
  <body>
    <h2>Pembuatan Akun CMS Baru</h2>
    <hr />

    <!-- Login Section -->
    <div id="loginSection">
      <p>Silakan masuk menggunakan akun Google Anda untuk melanjutkan pengisian form.</p>
      <div
        id="g_id_onload"
        data-client_id="MASUKKAN_CLIENT_ID_://googleusercontent.com"
        data-callback="handleCredentialResponse"
        data-auto_prompt="false"
      ></div>
      <div class="g_id_signin" data-type="standard" data-size="large" data-theme="outline"></div>
    </div>

    <!-- Form Section (Hidden by Default) -->
    <div id="formSection" class="hidden">
      <p>Selamat datang, <span id="userEmail" style="color: green;"></span>!</p>
      <form id="cmsForm">
        <div class="form-group">
          <label for="namaUsaha">Nama Usaha / Brand</label>
          <input type="text" id="namaUsaha" required placeholder="Contoh: Kopi Sedap Malam" />
        </div>
        <div class="form-group">
          <label for="deskripsiUsaha">Deskripsi Singkat Proyek / Bisnis</label>
          <textarea id="deskripsiUsaha" rows="4" required placeholder="Jelaskan produk Anda..."></textarea>
        </div>
        <button type="submit" id="submitBtn">Generate CMS & Konten</button>
      </form>
    </div>

    <div id="statusMessage"></div>
    <div id="previewSection" class="hidden">
      <h3>Hasil Layout Preview CMS</h3>
      <div id="layoutPreview" style="background: #f4f4f4; padding: 15px; border-left: 5px solid #007bff;"></div>
    </div>

    <script>
      let googleIdToken = "";
      const APPS_SCRIPT_URL = "https://google.com";

      function handleCredentialResponse(response) {
        googleIdToken = response.credential;
        const payload = JSON.parse(atob(googleIdToken.split(".")));
        document.getElementById("userEmail").innerText = payload.email;
        document.getElementById("loginSection").classList.add("hidden");
        document.getElementById("formSection").classList.remove("hidden");
      }

      document.getElementById("cmsForm").addEventListener("submit", async function (e) {
        e.preventDefault();
        const submitBtn = document.getElementById("submitBtn");
        const statusMessage = document.getElementById("statusMessage");

        const profileData = {
          nama_usaha: document.getElementById("namaUsaha").value,
          deskripsi: document.getElementById("deskripsiUsaha").value,
        };

        submitBtn.disabled = true;
        statusMessage.innerText = "Memproses Autentikasi, Gemini AI, & Duplikasi...";
        statusMessage.style.color = "orange";

        try {
          const response = await fetch(APPS_SCRIPT_URL, {
            method: "POST",
            mode: "cors",
            headers: { "Content-Type": "text/plain" },
            body: JSON.stringify({ id_token: googleIdToken, profile: profileData }),
          });

          const result = await response.json();

          if (result.status === "success") {
            statusMessage.innerText = "Sukses! Akun CMS Anda telah siap sepenuhnya.";
            statusMessage.style.color = "green";
            document.getElementById("previewSection").classList.remove("hidden");
            document.getElementById("layoutPreview").innerHTML = `
            <p><strong>Nama Brand:</strong> ${result.rendered_data.title}</p>
            <p><strong>URL REST API Baru:</strong> <a href="${result.web_app_url}" target="_blank">Link Endpoint /exec</a></p>
            <p><strong>Konten Awal:</strong> ${result.rendered_data.content}</p>
          `;
          } else {
            statusMessage.innerText = "Gagal: " + result.message;
            statusMessage.style.color = "red";
            submitBtn.disabled = false;
          }
        } catch (error) {
          statusMessage.innerText = "Error: " + error.toString();
          statusMessage.style.color = "red";
          submitBtn.disabled = false;
        }
      });
    </script>
  </body>
</html>
```

---

## 2. SISI BACKEND: Orkestrator Pusat (`Code.gs`)

Pastikan **Drive API v2/v3 Advanced Service** sudah diaktifkan di tab "Layanan" kiri editor Apps Script Anda.

```javascript
const GEMINI_API_KEY = "MASUKKAN_API_KEY_GEMINI_ANDA";
const SPREADSHEET_MASTER_ID = "MASUKKAN_SPREADSHEET_MASTER_ID_CMS";
const STUDIO_TEMPLATE_DRIVE_ID = "MASUKKAN_ID_FILE_PROMPT_STUDIO_DI_DRIVE";

/**
 * Endpoint Utama API HTTP POST
 */
function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const idToken = payload.id_token;
    const clientProfile = payload.profile;

    // 1. FASING AUTH: Verifikasi token JWT ke Google
    const googleUser = getGoogleUserProfile(idToken);
    if (!googleUser) {
      return buildJsonResponse({ status: "error", message: "Unauthorized: Token Google Tidak Valid" });
    }
    const emailKlien = googleUser.email;

    // 2. FASING AI: Generate konten menggunakan Gemini 2.5 Flash
    const generatedContent = generateCmsContentViaGemini(STUDIO_TEMPLATE_DRIVE_ID, clientProfile);

    // 3. FASING KLONING: Copy master ke Drive Operator terlebih dahulu
    const masterFile = DriveApp.getFileById(SPREADSHEET_MASTER_ID);
    const salinanFile = masterFile.makeCopy(`CMS - ${clientProfile.nama_usaha}`);
    const spreadsheetBaruId = salinanFile.getId();

    // 4. SUNTIK DATA: Tulis data profile & hasil AI ke Sheet baru
    const ss = SpreadsheetApp.openById(spreadsheetBaruId);
    const configSheet = ss.getSheetByName("Config") || ss.getSheets()[0];
    configSheet.getRange("B1").setValue(clientProfile.nama_usaha);
    configSheet.getRange("B2").setValue(generatedContent);

    // 5. FASING DEPLOYMENT: Nyalakan REST API (/exec) pada file baru secara otomatis
    // Catatan teknis: bound-script ID pada duplikasi spreadsheet bernilai identik dengan File ID-nya
    const scriptId = spreadsheetBaruId;
    const urlWebApiKlien = jalankanAutomatedDeploy(scriptId);

    // Tulis balik URL Web App ke dalam sheet miliknya sendiri
    configSheet.getRange("B3").setValue(urlWebApiKlien);

    // 6. FASING PRIVASI (SELF-DETACH): Hibahkan kepemilikan lalu cabut akses Anda
    salinanFile.addEditor(emailKlien);
    salinanFile.setOwner(emailKlien); // Memindahkan kepemilikan penuh ke klien

    const emailSaya = Session.getActiveUser().getEmail();
    salinanFile.removeEditor(emailSaya); // Hubungan server pusat terputus permanen dari file ini

    // 7. RESPONS BALIKAN KE KLIEN
    return buildJsonResponse({
      status: "success",
      web_app_url: urlWebApiKlien,
      rendered_data: {
        title: clientProfile.nama_usaha,
        content: generatedContent,
      },
    });
  } catch (error) {
    return buildJsonResponse({ status: "error", message: error.toString() });
  }
}

/**
 * Fungsi Pembantu: Verifikasi Token OIDC Google
 */
function getGoogleUserProfile(token) {
  if (!token) return null;
  try {
    const url = `https://googleapis.com{token}`;
    const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    return response.getResponseCode() === 200 ? JSON.parse(response.getContentText()) : null;
  } catch (e) {
    return null;
  }
}

/**
 * Fungsi Pembantu: Kontak API Gemini dengan Kunci Sistem Kaku
 */
function generateCmsContentViaGemini(templateId, profileData) {
  const rawTemplate = DriveApp.getFileById(templateId).getBlob().getDataAsString();
  const url = `https://googleapis.com{GEMINI_API_KEY}`;

  const systemInstruction =
    "Anda adalah CMS Content Builder profesional. Isi kerangka template yang diberikan berdasarkan profil user secara presisi tanpa teks narasi tambahan di luar struktur.";
  const userPrompt = `Profile: ${JSON.stringify(profileData)}. Struktur Template:\n${rawTemplate}`;

  const payload = {
    contents: [{ parts: [{ text: userPrompt }] }],
    systemInstruction: { parts: [{ text: systemInstruction }] },
    generationConfig: { temperature: 0.2 }, // Kaku agar patuh struktur template
  };

  const res = UrlFetchApp.fetch(url, {
    method: "POST",
    contentType: "application/json",
    payload: JSON.stringify(payload),
  });

  const json = JSON.parse(res.getContentText());
  return json.candidates[0].content.parts[0].text;
}

/**
 * Fungsi Pembantu: Menghubungi Google Apps Script API untuk Programmatic Web App Deploy
 */
function jalankanAutomatedDeploy(scriptId) {
  const oAuthToken = ScriptApp.getOAuthToken();
  const headers = {
    Authorization: `Bearer ${oAuthToken}`,
    "Content-Type": "application/json",
  };

  // Langkah A: Buat Snapshot Versi Proyek Baru
  const urlCreateVersion = `https://googleapis.com{scriptId}/versions`;
  const resVersion = UrlFetchApp.fetch(urlCreateVersion, {
    method: "POST",
    headers: headers,
    payload: JSON.stringify({ description: "SaaS Auto Deployment" }),
    muteHttpExceptions: true,
  });
  const nomorVersiBaru = JSON.parse(resVersion.getContentText()).versionNumber;
  if (!nomorVersiBaru) throw new Error("Gagal membuat versi script baru: " + resVersion.getContentText());
  // Langkah B: Aktivasi Deployment Aplikasi Web
  const urlCreateDeploy = `https://googleapis.com{scriptId}/deployments`;
  const deployPayload = {
    versionNumber: nomorVersiBaru,
    manifestFileName: "appsscript",
    description: "Production Web App API Klien",
  };
  const resDeploy = UrlFetchApp.fetch(urlCreateDeploy, {
    method: "POST",
    headers: headers,
    payload: JSON.stringify(deployPayload),
    muteHttpExceptions: true,
  });
  const dataDeploy = JSON.parse(resDeploy.getContentText());
  if (dataDeploy.entryPoints && dataDeploy.entryPoints.length > 0) {
    return dataDeploy.entryPoints[0].webApp.url;
    // Mengembalikan link /exec untuk CMS Engine Klien
  } else {
    throw new Error("Gagal mengaktifkan Web App Deployment: " + resDeploy.getContentText());
  }
}

function buildJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}
```

## 3. MANIFEST CONFIG: Otorisasi Cakupan Skrip (`appsscript.json`)

Buka berkas manifes internal Anda dan pastikan properti oauthScopes berikut telah didaftarkan lengkap.

```json
{
  "timeZone": "Asia/Jakarta",
  "dependencies": {},
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8",
  "oauthScopes": ["https://googleapis.com", "https://googleapis.com", "https://googleapis.com", "https://googleapis.com"]
}
```

````js
const systemInstruction =
  "Anda adalah database engineer pengubah cerita UMKM menjadi skema komparasi data. " +
  "WAJIB kembalikan output dalam format JSON murni yang mematuhi skema konstruktor TableBuilderService. " +
  "Dilarang memberikan kata pengantar, dilarang memberikan tanda kutip markdown ```json. " +
  "Pastikan kolom harga menggunakan tipe data angka (number) tanpa format titik/koma, " +
  "dan wajib sertakan kolom formula dinamis 'Estimasi_Omzet' dengan rumus '={{Harga_Jual}}\*{{Stok}}'.";
````
