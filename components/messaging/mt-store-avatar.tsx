"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BadgeCheck, X } from "lucide-react";

import { MT_STORE } from "@/components/messaging/chat-parts";
import { MtStoreIdentity } from "@/components/messaging/mt-store-identity";
import { cn } from "@/lib/utils";

/**
 * The official MT Store avatar. Clicking it opens the store's contact card:
 * email plus the real social accounts, so a customer can verify who they are
 * talking to and reach the shop elsewhere.
 */
export function MtStoreAvatar({
  size = 36,
  online = false,
  className,
  open: controlledOpen,
  onOpenChange,
}: {
  size?: number;
  online?: boolean;
  className?: string;
  /** Controlled open state, so the store name can toggle the same card. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = (next: boolean | ((current: boolean) => boolean)) => {
    const value = typeof next === "function" ? next(open) : next;
    if (controlledOpen === undefined) setUncontrolledOpen(value);
    onOpenChange?.(value);
  };
  // Keep a stable reference for the document listeners below.
  const close = useCallback(() => {
    if (controlledOpen === undefined) setUncontrolledOpen(false);
    onOpenChange?.(false);
  }, [controlledOpen, onOpenChange]);
  const wrapper = useRef<HTMLDivElement>(null);

  // Close on outside click / Escape, like any other popover.
  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      // The store-name button lives outside this wrapper but drives the same
      // state, so its own clicks must not immediately close the card.
      if (wrapper.current?.contains(event.target as Node)) return;
      if ((event.target as HTMLElement)?.closest?.("[data-store-identity-trigger]")) return;
      close();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [close, open]);

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

          <div className="p-2.5">
            <MtStoreIdentity />
          </div>
        </div>
      ) : null}
    </div>
  );
}
