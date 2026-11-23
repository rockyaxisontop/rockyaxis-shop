  "use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MessageSquarePlus, X } from "lucide-react";

import {
  QUICK_MESSAGES,
  type QuickMessageContext,
  type QuickMessage,
} from "@/lib/messaging/quick-replies";
import { cn } from "@/lib/utils";

const GROUPS: Array<{ key: QuickMessage["group"]; label: string }> = [
  { key: "order", label: "Order" },
  { key: "payment", label: "Payment" },
  { key: "profile", label: "Profile" },
  { key: "general", label: "General" },
];

/**
 * Quick-message picker for the admin.
 *
 * Templates are rendered against THIS customer's real data (address, phone,
 * order reference and total), so the rep can send a precise answer in one tap.
 */
export function QuickMessagePicker({
  context,
  onInsert,
  disabled,
}: {
  context: QuickMessageContext;
  onInsert: (text: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [group, setGroup] = useState<QuickMessage["group"]>("order");
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!panel.current?.contains(event.target as Node)) setOpen(false);
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

  const visible = useMemo(
    () => QUICK_MESSAGES.filter((message) => message.group === group),
    [group],
  );

  return (
    <div ref={panel} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        disabled={disabled}
        aria-label="Quick messages"
        aria-expanded={open}
        title="Quick messages"
        className={cn(
          "grid size-9 shrink-0 place-items-center rounded-full transition hover:bg-surface-2 hover:text-brand disabled:opacity-40",
          open ? "bg-brand text-white hover:bg-brand" : "text-ink-soft",
        )}
      >
        <MessageSquarePlus className="size-5" />
      </button>

      {open ? (
        <div className="absolute bottom-12 left-0 z-40 w-[min(23rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-border bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <p className="text-xs font-extrabold text-ink">Quick messages</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close quick messages"
              className="grid size-6 place-items-center rounded-full text-ink-soft hover:bg-surface-2"
            >
              <X className="size-3.5" />
            </button>
          </div>

          <div className="flex gap-1 border-b border-border px-2 py-1.5">
            {GROUPS.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setGroup(item.key)}
                className={cn(
                  "rounded-full px-2.5 py-1 text-[10px] font-bold transition",
                  group === item.key ? "bg-brand text-white" : "bg-surface-2 text-ink-soft",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>

          <ul className="max-h-72 overflow-y-auto p-1.5">
            {visible.map((message) => (
              <li key={message.id}>
                <button
                  type="button"
                  onClick={() => {
                    onInsert(message.build(context));
                    setOpen(false);
                  }}
                  className="w-full rounded-lg px-2.5 py-2 text-left transition hover:bg-brand-tint"
                >
                  <span className="block text-[11px] font-extrabold text-ink">{message.label}</span>
                  <span className="mt-0.5 line-clamp-2 block text-[10px] leading-4 text-ink-soft">
                    {message.build(context).replace(/\n+/g, " ")}
                  </span>
                </button>
              </li>
            ))}
          </ul>

          <p className="border-t border-border bg-surface-2 px-3 py-1.5 text-[9px] text-ink-soft">
            Messages use this customer&apos;s real address and order details.
          </p>
        </div>
      ) : null}
    </div>
  );
}
