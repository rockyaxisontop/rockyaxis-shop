"use client";

import { useEffect, useState } from "react";
import { MessageCircle, Phone, X } from "lucide-react";

const PHONE_NUMBER = "+977-9714501791";
const WHATSAPP_URL = `https://wa.me/9779714501791?text=${encodeURIComponent("Hello, I need help with an order.")}`;

export function FloatingOrderContact() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  return (
    <div className="fixed right-4 bottom-4 z-[60]">
      {open ? (
        <section
          id="order-contact-panel"
          aria-labelledby="order-contact-title"
          className="absolute right-0 bottom-16 w-[min(22rem,calc(100vw-3rem))] overflow-hidden rounded-xl border border-border bg-white shadow-xl shadow-black/15"
        >
          <div className="flex items-start justify-between gap-4 bg-[#075e54] px-4 py-4 text-white">
            <div className="flex items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-white/15">
                <MessageCircle className="size-5" aria-hidden />
              </span>
              <div>
                <h2 id="order-contact-title" className="text-sm font-bold">For Order Contact Us</h2>
                <p className="mt-0.5 text-xs text-white/80">We’re here to help with your order.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close order contact"
              className="grid size-8 shrink-0 place-items-center rounded-full text-white/80 transition-colors hover:bg-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="p-4">
            <a href={`tel:${PHONE_NUMBER.replaceAll("-", "")}`} className="text-sm font-semibold text-ink hover:text-brand">
              {PHONE_NUMBER}
            </a>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <a
                href={WHATSAPP_URL}
                aria-label="Chat on WhatsApp"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#128c7e] px-3 text-xs font-semibold text-white transition-colors hover:bg-[#075e54] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#128c7e] focus-visible:ring-offset-2"
              >
                <MessageCircle className="size-4" aria-hidden />
                WhatsApp
              </a>
              <a
                href={`tel:${PHONE_NUMBER.replaceAll("-", "")}`}
                aria-label={`Call ${PHONE_NUMBER}`}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border px-3 text-xs font-semibold text-ink transition-colors hover:border-brand hover:bg-brand-tint hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
              >
                <Phone className="size-4" aria-hidden />
                Call now
              </a>
            </div>
          </div>
        </section>
      ) : null}

      <button
        type="button"
        aria-label={open ? "Close order contact" : "Contact us for orders"}
        aria-controls="order-contact-panel"
        aria-expanded={open}
        title="For Order Contact Us"
        onClick={() => setOpen((value) => !value)}
        className="relative grid size-14 place-items-center rounded-full bg-[#128c7e] text-white shadow-lg shadow-[#075e54]/25 transition-transform hover:scale-105 hover:bg-[#075e54] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#128c7e] focus-visible:ring-offset-2"
      >
        {open ? <X className="size-6" /> : <MessageCircle className="size-6" />}
        {!open ? (
          <span className="absolute -top-0.5 -right-0.5 grid size-5 place-items-center rounded-full border-2 border-white bg-[#075e54]">
            <Phone className="size-2.5" aria-hidden />
          </span>
        ) : null}
      </button>
    </div>
  );
}