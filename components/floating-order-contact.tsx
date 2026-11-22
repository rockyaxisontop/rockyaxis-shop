"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageCircle, ShoppingBag, X } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Floating "contact us" bubble.
 *
 * It opens the shop's own messenger at /message — there is no WhatsApp or phone
 * number involved, so every conversation stays inside MT Store.
 */
export function FloatingOrderContact() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname() ?? "";
  // Campaign pages have a sticky share bar on phones; keep the bubble clear of it.
  const hasStickyBar = /^\/freebie\/mine\//.test(pathname);
  // The chat page has its own composer, so the bubble would only get in the way.
  const onChatPage = pathname.startsWith("/message");

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  if (onChatPage) return null;

  return (
    <div className={cn("fixed right-4 z-[60]", hasStickyBar ? "hidden sm:block sm:bottom-4" : "bottom-4")}>
      {open ? (
        <section
          id="order-contact-panel"
          aria-labelledby="order-contact-title"
          className="absolute right-0 bottom-16 w-[min(20rem,calc(100vw-3rem))] overflow-hidden rounded-xl border-border bg-white shadow-xl shadow-black/15"
        >
          <div className="flex items-start justify-between gap-4 bg-brand px-4 py-3 text-white">
            <div className="flex items-center gap-2.5">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white p-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/icon-192.png" alt="" className="size-full rounded-md object-cover" />
              </span>
              <div>
                <h2 id="order-contact-title" className="text-sm font-bold">
                  Chat with MT Store
                </h2>
                <p className="mt-0.5 text-[11px] text-white/80">Replies in a few minutes.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close contact panel"
              className="grid size-8 shrink-0 place-items-center rounded-full text-white/80 transition-colors hover:bg-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="p-3">
            <p className="text-xs leading-5 text-ink-soft">
              Send your order or ask a question — everything happens right here on our site.
            </p>
            <Link
              href="/message"
              className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand text-sm font-bold text-white transition hover:brightness-110"
            >
              <MessageCircle className="size-4" />
              Open messages
            </Link>
            <Link
              href="/cart"
              className="mt-2 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border-border text-xs font-semibold text-ink transition hover:border-brand hover:text-brand"
            >
              <ShoppingBag className="size-3.5" />
              View my cart
            </Link>
          </div>
        </section>
      ) : null}

      <button
        type="button"
        aria-label={open ? "Close contact panel" : "Chat with MT Store"}
        aria-controls="order-contact-panel"
        aria-expanded={open}
        title="Chat with MT Store"
        onClick={() => setOpen((value) => !value)}
        className="relative grid size-14 place-items-center overflow-hidden rounded-full bg-brand text-white shadow-lg shadow-brand/30 transition-transform hover:scale-105 hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
      >
        {open ? <X className="size-6" /> : <MessageCircle className="size-6" />}
      </button>
    </div>
  );
}
