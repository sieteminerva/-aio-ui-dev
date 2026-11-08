import type { iPageContent } from "@aio-ui/app";

import { demoNav, pageIntro } from "../nav";

/**
 * Form page — a form schema, not a component catalogue entry.
 *
 * The form is a page component: it owns fields, validation, handlers and its own
 * submit lifecycle. Keeping it on its own route is what makes that lifecycle visible;
 * inside the element catalogue it would look like "just another builder".
 */

const schema = [
  {
    id: "order",
    title: "Detail pesanan",
    group: [
      { type: "text", id: "name", title: "Nama", placeholder: "Nama lengkap" },
      { type: "email", id: "email", title: "Email", placeholder: "nama@email.com" },
      { type: "tel", id: "phone", title: "Telepon", placeholder: "+62…" },
      { type: "select", id: "size", title: "Ukuran", options: ["S", "M", "L", "XL"] },
      { type: "number", id: "qty", title: "Jumlah", placeholder: "1" },
      { type: "textarea", id: "notes", title: "Catatan", placeholder: "Warna, sablon, atau deadline" },
      { type: "checkbox", id: "agree", title: "Saya setuju dengan ketentuan pesanan" },
    ],
  },
];

const formConfig = {
  id: "demo-order-form",
};

export function formContent(): iPageContent {
  return {
    ".page": {
      content: {
        ...demoNav,
        ...pageIntro("Form", "schema-driven · validation, handlers, dan submit dimiliki form itu sendiri"),
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

                el.appendChild(log);
              },
            },
          },
        },
      },
    },
  } as iPageContent;
}
