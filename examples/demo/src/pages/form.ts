import type { iPageContent } from "@aio-ui/app";

import { ModuleLoader } from "@aio-ui/module-loader/ModuleLoader";
import { CORE_FORM_MODULES } from "@aio-ui/form/FormRegistry";
import { tableFormAdapter } from "@aio-ui/table/Table.FormAdapter";
import { messageFormAdapter } from "@aio-ui/message/Message.FormAdapter";
import { demoNav, pageIntro } from "../nav";
import { themeSwitcher } from "../theme-switcher";
import type { iBasicInputNode } from "@aio-ui/input/Input";

/**
 * Form page — a form schema, not a component catalogue entry.
 *
 * The form is a page component: it owns fields, validation, handlers and its own
 * submit lifecycle. Keeping it on its own route is what makes that lifecycle visible;
 * inside the element catalogue it would look like "just another builder".
 */
let isEditing = false;
const selectors = { "@field>label": { tagName: "label", /* attrs: { "animation": "typewriter", "animation-chain": "true", "animated-once": "true" } */ } }

// ID ADDRESS input sets
export const AddressSet = {
  id: "address-set",
  legend: "Id Address Set",
  // condition: { field: "contact-company", filled: true },
  group: [
    {
      type: "textarea",
      id: "address-jalan",
      // condition: { field: "logo", filled: true },
      title: "Pusat workshop atau rumah tempat kerja mu ini beralamat di",
      placeholder: "Tuliskan nama jalan, nomor rumah, atau ruko usahamu...",
      config: {
        selectors,
        attributes: [
          { name: "animation", value: "fade-in" },
          { name: "animation-chain", value: "true" },
          { name: "animated-once", value: "true" },
        ],
      }
    },
    {
      type: "select",
      id: "address-propinsi",
      // condition: { field: "jalan", filled: true },
      title: "Tepatnya, wilayah tersebut berada di cakupan wilayah",
      placeholder: "pilih provinsi   ",
      config: {
        className: "loading",
        selectors,
        attributes: [
          { name: "data-level", value: "propinsi" },
          // { name: "animation", value: "fade-in" },
          // { name: "animation-chain", value: "true" },
          // { name: "animated-once", value: "true" },
        ]
      }
    },
    {
      type: "select",
      id: "address-kota",
      // condition: { field: "jalan", filled: true },
      title: "pada wilayah administrasi daerah",
      placeholder: "pilih kota/kabupaten   ",
      config: {
        selectors,
        attributes: [
          { name: "data-level", value: "kota" },
          // { name: "animation", value: "fade-in" },
          // { name: "animation-chain", value: "true" },
          // { name: "animated-once", value: "true" },
        ]
      }
    },

    {
      type: "select",
      id: "address-kecamatan",
      // condition: { field: "jalan", filled: true },
      title: "meluas ke area wilayah tingkat",
      placeholder: "pilih kecamatan   ",
      config: {
        selectors,
        attributes: [
          { name: "data-level", value: "kecamatan" },
          // { name: "animation", value: "fade-in" },
          // { name: "animation-chain", value: "true" },
          // { name: "animated-once", value: "true" },
        ]
      }
    },

    {
      type: "select",
      id: "address-kelurahan",
      // condition: { field: "jalan", filled: true },
      title: "hingga menyentuh batas terkecil di",
      placeholder: "pilih kelurahan   ",
      config: {
        selectors,
        attributes: [
          { name: "data-level", value: "kelurahan" },
          // { name: "animation", value: "fade-in" },
          // { name: "animation-chain", value: "true" },
          // { name: "animated-once", value: "true" },
        ]
      }
    },

    {
      type: "text",
      id: "address-kodepos",
      // condition: { field: "jalan", filled: true },
      title: "dengan penguncian kode pos resmi",
      placeholder: "kodepos",
      config: {
        selectors,
        attributes: [
          { name: "data-level", value: "kodepos" },
          // { name: "animation", value: "fade-in" },
          // { name: "animation-chain", value: "true" },
          // { name: "animated-once", value: "true" },
        ]
      }
    },
  ]
}

// INPUT CONTROL Sets
export const InputControlSet = {
  id: "test-set",
  legend: "Input Controls",
  group: [
    {
      type: "text",
      id: "test-1",
      title: "Test Text",
      placeholder: "Isi apa aja",
      editable: true,
      config: {
        actions: [
          {
            type: "copy",
            label: "copy",
            onClick: (_e: Event, payload: any) => {
              console.log("action!! COPY", payload)
            }
          },
          {
            type: "delete",
            label: "delete",
            onClick: (_e: Event, payload: any) => {
              console.log("action!! delete", payload)
            }
          },
          {
            type: "add",
            label: "new",
            onClick: (_e: Event, payload: any) => {
              console.log("action!! ADD", payload)
            }
          },
          {
            type: "edit",
            label: "edit",
            onClick: (_e: Event, payload: any) => {
              isEditing = !isEditing;
              console.log("action!! EDIT", `isEditing: ${isEditing}`, payload)
            }
          }
        ]
      }
    },
    {
      type: "select",
      id: "test-2",
      title: "Test Text",
      placeholder: "Pilih mana saja",
      editable: true,
      config: {
        options: [
          "A", "B", "C", "D"
        ],
        actions: [
          {
            type: "copy",
            label: "",
            onClick: (_e: Event, payload: any) => {
              console.log("action!! COPY", payload)
            }
          },
          {
            type: "delete",
            label: "",
            onClick: (_e: Event, payload: any) => {
              console.log("action!! delete", payload)
            }
          },
          {
            type: "add",
            label: "",
            onClick: (_e: Event, payload: any) => {
              console.log("action!! ADD", payload)
            }
          },
          {
            type: "edit",
            label: "edit",
            onClick: (_e: Event, payload: any) => {
              isEditing = !isEditing;
              console.log("action!! EDIT", `isEditing: ${isEditing}`, payload)
            }
          }
        ]
      }
    },
    // A group is a scope for the control set: `search` reads the whole fieldset with the
    // same vocabulary a submit uses, and reports it through `context.result` + a `search`
    // event on the fieldset.
    {
      id: "lookup",
      title: "Cari pesanan lama",
      // `search` reads the group; `copy` copies it. One word each — no callbacks needed.
      actions: ["search", "copy"],
      group: [
        { type: "text", id: "lookup-invoice", title: "No. invoice", placeholder: "INV-…" },
        { type: "select", id: "lookup-status", title: "Status", options: ["Baru", "Diproses", "Selesai"] },
      ] as iBasicInputNode[],
    },
    // Two words replace four buttons: `editor` = edit+save, `repeater` = add+delete.
    {
      id: "customer",
      title: "Data pelanggan",
      actions: ["editor", "repeater"],
      group: [
        // `editable: true` keeps this one field writable while Edit/Save lock the group.
        { type: "text", id: "customer-name", title: "Nama pelanggan", placeholder: "Belum diisi", editable: true },
        { type: "select", id: "customer-tier", title: "Tier", options: ["Bronze", "Silver", "Gold"] },
        // A dropdown is part of the set's job too: locked as a unit (box + hidden value).
        { type: "dropdown", id: "customer-city", title: "Kota", config: { style: "datalist", options: ["Bandung", "Jakarta", "Surabaya"] } },
      ] as iBasicInputNode[],
    },

    // A row is a scope as well, not only a fieldset: same `actions`, buttons in the corner.
    {
      id: "row-record",
      title: "Baris record",
      column: 2,
      actions: ["editor", "repeater"],
      row: [
        { type: "text", id: "row-sku", title: "SKU", config: { wide: 50 } },
        { type: "text", id: "row-qty", title: "Qty", config: { wide: 50 } },
        // Cascade inside a locked scope: appears once SKU has a value, i.e. after Edit.
        { type: "text", id: "row-note", title: "Catatan baris", condition: { field: "row-sku", filled: true } },
      ] as iBasicInputNode[],
    },

  ]

}

export const DropdownSet = {
  legend: "dropdown",
  group: [
    // ══ Test bed: Dropdown mode select (Semantic-UI style) ──────────────
    {
      type: "dropdown",
      id: "test-dropdown-single",
      title: "Satu pilihan (style=select)",
      placeholder: "Ketik atau pilih satu...",
      config: {
        style: "select",
        min: 1,
        max: 6,
        options: [
          { value: "jakarta", label: "Jakarta" },
          { value: "bandung", label: "Bandung" },
          { value: "surabaya", label: "Surabaya" },
          { value: "yogyakarta", label: "Yogyakarta" },
          { value: "bali", label: "Bali" },
          { value: "makassar", label: "Makassar" }
        ],
        onSelect: (value: string, id: string | null) => {
          console.log("[Dropdown single] onSelect", { value, id });
        }
      }
    },
    {
      type: "dropdown",
      id: "test-dropdown-multi",
      title: "Banyak pilihan (style=select + isMultiple)",
      placeholder: "Ketik lalu pilih banyak...",
      config: {
        style: "select",
        isMultiple: true,
        min: 1,
        max: 15,
        options: [
          "Kopi",
          "Teh",
          "Jus Alpukat",
          "Kue Lapis",
          "Klepon",
          "Wajik",
          "Sekoteng",
          "Semar Mendem",
          "Jenang",
          "Nasi Liwet",
          "Tengkleng"
        ],
        onMultiChange: (items: any[]) => {
          console.log("[Dropdown multi] onMultiChange", items);
        }
      }
    },
  ]
}

const schema = [

  InputControlSet,

  {
    id: "order",
    title: "Detail pesanan",
    group: [
      { type: "text", id: "name", title: "Nama", placeholder: "Nama lengkap" },
      { type: "email", id: "email", title: "Email", placeholder: "nama@email.com" },
      { type: "tel", id: "phone", title: "Telepon", placeholder: "+62…" },
      { type: "select", id: "size", title: "Ukuran", options: ["S", "M", "L", "XL"] },
      // Dropdowns are a module, and their stylesheet arrives through the lazy seam —
      // nothing in the bundle imports `Dropdown.css`.
      {
        type: "dropdown",
        id: "material",
        title: "Bahan",
        config: {
          style: "datalist",
          options: ["Katun Combed 30s", "Katun Combed 24s", "Cvc", "Linen", "Rajut"],
        },
      },
      { type: "number", id: "qty", title: "Jumlah", placeholder: "1" },
      { type: "textarea", id: "notes", title: "Catatan", placeholder: "Warna, sablon, atau deadline" },
      { type: "checkbox", id: "agree", position: "right", title: "Saya setuju dengan ketentuan pesanan" },
      // Radios sharing a name form one group; `style: "toggle"` asks for the switch shell.
      { type: "radio", id: "pickup", name: "delivery", value: "pickup", title: "Ambil sendiri", config: { style: "toggle" } },
      { type: "radio", id: "courier", name: "delivery", value: "courier", title: "Kirim kurir", checked: true, config: { style: "toggle" } },
      // Cascade: this field only exists while the delivery radio says "courier".
      { type: "text", id: "courierNote", title: "Catatan untuk kurir", condition: { field: "delivery", equals: "courier" } },
    ] as iBasicInputNode[],
  },
  // Inline row: `column` is the column count, `config.wide` the share a field takes
  // (50 = half, "auto" = full row). A row is layout, not a fieldset — `group` above.
  AddressSet,
  {
    id: "files",
    title: "Berkas",
    group: [
      // `config.csv` is a declaration, not a parser: it marks the file as tabular so the
      // table module previews it. The input layer still reports raw `File` objects.
      { type: "file", id: "product-csv", title: "Impor produk (CSV)", config: { csv: true, accept: ".csv,text/csv" } },
      { type: "file", id: "reference-photo", title: "Foto referensi", config: { view: "thumbnail" } },
    ] as iBasicInputNode[],
  },
  {
    id: "identity",
    label: "Identitas pemesan",
    column: 2,
    row: [
      { type: "text", id: "first", title: "Nama depan", config: { wide: 50 } },
      { type: "text", id: "last", title: "Nama belakang", config: { wide: 50 } },
      { type: "textarea", id: "street", title: "Alamat lengkap", config: { wide: "auto" } },
    ] as iBasicInputNode[],
  },
  DropdownSet,
];

/**
 * Real regional endpoint (Google Apps Script deployment).
 *
 * The picker no longer ships an endpoint — the demo declares it here, and the builder
 * talks to it through `HttpService` (cache + timeout included). Swap this for
 * `address.loader(query)` if the data should come from the app's own HTTP service.
 */
const ADDRESS_URL = "https://script.google.com/macros/s/AKfycbwjQ_iNQClJuyf5z1ZlJcJ-j6LEnINfvbBmjBFlE4T3X4dVAoxF_GzUCCv6TXZ_apfhpA/exec";

const addressSource = { url: ADDRESS_URL };

/**
 * The host composes the module set: the form ships its own engines, while `table` and
 * `message` contribute their adapters — the form never imports them.
 */
function formModules() {
  return new ModuleLoader("form", [...CORE_FORM_MODULES, tableFormAdapter, messageFormAdapter]);
}

const formConfig = {
  id: "demo-order-form",
  modules: formModules(),
  address: addressSource,
  // Cascade needs the engine on; `hidden` keeps conditional fields alive so a chained
  // picker (address, dependent select) can inject into them before they are shown.
  cascading: true,
  cascadeMode: "hidden" as const,
};

/** Three steps, one per group — the engine owns the next/back set. */
const multiStepSchema = [
  { id: "ms-contact", title: "Langkah 1 · Kontak", group: [{ type: "email", id: "ms-email", title: "Email", required: true }] },
  { id: "ms-address", title: "Langkah 2 · Alamat", group: [{ type: "text", id: "ms-city", title: "Kota", required: true }] },
  { id: "ms-confirm", title: "Langkah 3 · Konfirmasi", group: [{ type: "checkbox", id: "ms-agree", title: "Saya setuju" }] },
] as any[];

export function formContent(): iPageContent {
  return {
    ".page": {
      content: {
        ...demoNav,
        ...pageIntro("Form", "schema-driven · validation, handlers, dan submit dimiliki form itu sendiri"),
        ...themeSwitcher,
        "main.form-page": {
          content: {
            ".form-host": {
              builder: ["form"],
              onCreated: (el: HTMLElement, _render: any, build: any) => {
                const form = build("form", { schema, config: formConfig });
                el.mount(form);

                const log = document.createElement("pre");
                log.className = "form-log";
                log.textContent = "Menunggu submit…";

                form.addEventListener("formSubmit", (event: any) => {
                  log.textContent = `formSubmit → ${JSON.stringify(event.detail?.data ?? {}, null, 2)}`;
                });

                form.addEventListener("formValidation", (event: any) => {
                  const { reason, message } = event.detail ?? {};
                  if (reason !== "valid") log.textContent = `formValidation (${reason}) → ${message ?? ""}`;
                });

                // A group's `search` action is a read, not a submit: it bubbles up from
                // the fieldset so the page can answer without knowing the controls layer.
                form.addEventListener("search", (event: any) => {
                  log.textContent = `search → ${JSON.stringify(event.detail?.query ?? {}, null, 2)}`;
                });

                el.appendChild(log);
              },
            },
            // Multistep form: three groups become three steps.
            ".form-host.multistep": {
              builder: ["form"],
              onCreated: (el: HTMLElement, _render: any, build: any) => {
                const form = build("form", { schema: multiStepSchema, config: { id: "demo-multistep", multistep: true, modules: formModules() } });
                el.mount(form);

                const log = document.createElement("pre");
                log.className = "form-log";
                log.textContent = "Multistep siap…";

                form.addEventListener("formSubmit", (event: any) => {
                  log.textContent = `formSubmit → ${JSON.stringify(event.detail?.data ?? {}, null, 2)}`;
                });

                el.appendChild(log);
              },
            },
          },
        },
      },
    },
  } as iPageContent;
}
