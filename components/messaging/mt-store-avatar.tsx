"use client";

import { useEffect, useRef, useState } from "react";
import { BadgeCheck, Facebook, Instagram, Mail, Music2, Youtube, X } from "lucide-react";

import { MT_STORE } from "@/components/messaging/chat-parts";
import { SITE_CONTACT, SITE_SOCIAL_LINKS } from "@/lib/site";
import { cn } from "@/lib/utils";

const ICONS = {
  instagram: Instagram,
  facebook: Facebook,
  tiktok: Music2,
  youtube: Youtube,
} as const;

/**
 * The official MT Store avatar. Clicking it opens the store's contact card:
 * email plus the real social accounts, so a customer can verify who they are
 * talking to and reach the shop elsewhere.
 */
export function MtStoreAvatar({
  size = 36,
  online = false,
  className,
}: {
  size?: number;
  online?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);

  // Close on outside click / Escape, like any other popover.
  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={wrapper} className={cn("relative shrink-0", className)}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label="About MT Store"
        aria-expanded={open}
        className="relative block rounded-full transition hover:ring-2 hover:ring-brand/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        style={{ width: size, height: size }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={MT_STORE.photo}
          alt="MT Store"
          width={size}
          height={size}
          className="size-full rounded-full border border-border object-contain p-0.5"
        />
        {online ? (
          <span className="absolute right-0 bottom-0 size-2.5 rounded-full border-2 border-white bg-stock" />
        ) : null}
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="MT Store contact information"
          className="absolute top-full left-0 z-50 mt-2 w-64 overflow-hidden rounded-xl border border-border bg-white shadow-xl shadow-black/15"
        >
          <div className="flex items-center gap-2.5 border-b border-border bg-brand-tint px-3 py-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={MT_STORE.photo}
              alt=""
              className="size-10 rounded-full border border-border bg-white object-contain p-0.5"
            />
            <div className="min-w-0">
              <p className="flex items-center gap-1 text-sm font-extrabold text-ink">
                {MT_STORE.name}
                <BadgeCheck className="size-3.5 text-brand" aria-label="Official account" />
              </p>
              <p className="truncate text-[11px] text-ink-soft">{MT_STORE.tagline}</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="ml-auto grid size-7 shrink-0 place-items-center rounded-full text-ink-soft hover:bg-white"
            >
              <X className="size-3.5" />
            </button>
          </div>

          <div className="p-3">
            <a
              href={`mailto:${SITE_CONTACT.email}`}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-semibold text-ink transition hover:bg-surface-2"
            >
              <Mail className="size-3.5 text-brand" />
              <span className="truncate">{SITE_CONTACT.email}</span>
            </a>

            <p className="mt-2 px-2 text-[10px] font-bold tracking-wider text-ink-soft uppercase">
              Follow us
            </p>
            <ul className="mt-1 grid grid-cols-2 gap-1">
              {SITE_SOCIAL_LINKS.map(({ label, href, icon }) => {
                const Icon = ICONS[icon];
                return (
                  <li key={label}>
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-semibold text-ink transition hover:bg-brand-tint hover:text-brand"
                    >
                      <Icon className="size-3.5 text-brand" />
                      {label}
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  );
}
