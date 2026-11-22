"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FileText, ImageIcon, Link2, Mic, Paperclip, Send, Video, X } from "lucide-react";

import { messageApi, adminApi } from "@/lib/messaging/client";
import { useCurrency } from "@/components/currency-provider";
import { STORE_DISCOUNT_PERCENT, storeLineTotal, storeListPrice, storePrice } from "@/lib/discount";
import { formatMoney } from "@/lib/format";
import type { Attachment, MessageKind, OrderPayload, PublicMessage } from "@/lib/messaging/types";
import { cn } from "@/lib/utils";

/** Official MT Store identity, shown exactly like WhatsApp's business account. */
export const MT_STORE = {
  name: "MT Store",
  photo: "/icon-192.png",
  tagline: "Official store · usually replies in a few minutes",
};

/* -------------------------------------------------------------------------- */
/* Live messages                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Realtime message stream.
 *
 * Firestore rules forbid client reads on these collections, so this listener
 * would fail — instead we poll the API, which is authorised server-side. The
 * poll is 3s while the thread is visible and pauses when the tab is hidden, so
 * a background tab costs nothing.
 */
export function useLiveMessages({
  conversationUid,
  admin,
  pageSize = 30,
}: {
  conversationUid: string | null;
  admin: boolean;
  pageSize?: number;
}) {
  const [messages, setMessages] = useState<PublicMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const seen = useRef<Set<string>>(new Set());

  const merge = useCallback((incoming: PublicMessage[]) => {
    setMessages((current) => {
      const map = new Map(current.map((m) => [m.id, m]));
      for (const message of incoming) map.set(message.id, message);
      return [...map.values()].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
    });
  }, []);

  const load = useCallback(
    async (initial = false) => {
      if (!conversationUid) return;
      try {
        const { messages: batch } = admin
          ? await adminApi.messages(conversationUid)
          : await messageApi.listMessages();
        merge(batch);
        if (initial) setHasMore(batch.length >= pageSize);
        setError(null);
      } catch (cause) {
        if (initial) setError(cause instanceof Error ? cause.message : "Couldn't load messages.");
      } finally {
        setLoading(false);
      }
    },
    [admin, conversationUid, merge, pageSize],
  );

  useEffect(() => {
    seen.current = new Set();
    setMessages([]);
    setLoading(true);
    void load(true);
  }, [load]);

  useEffect(() => {
    if (!conversationUid) return;
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, 3000);
    return () => clearInterval(timer);
  }, [conversationUid, load]);

  async function loadOlder() {
    const oldest = messages[0];
    if (!oldest) return;
    try {
      const { messages: batch } = admin
        ? await adminApi.messages(conversationUid!, oldest.id)
        : await messageApi.listMessages(oldest.id);
      merge(batch);
      if (batch.length < pageSize) setHasMore(false);
    } catch {
      setHasMore(false);
    }
  }

  return { messages, loading, error, hasMore, loadOlder, merge };
}

/* -------------------------------------------------------------------------- */
/* Formatting                                                                 */
/* -------------------------------------------------------------------------- */

export function formatTime(iso: string) {
  const date = new Date(iso);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function formatDay(iso: string) {
  const date = new Date(iso);
  const today = new Date();
  const sameDay = date.toDateString() === today.toDateString();
  if (sameDay) return "Today";
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" });
}

/** Links inside message text become clickable; everything else stays inert. */
export function linkify(text: string, onDark: boolean) {
  const parts = text.split(/(https?:\/\/[^\s]+)/g);
  return parts.map((part, index) =>
    /^https?:\/\//.test(part) ? (
      <a
        key={index}
        href={part}
        target="_blank"
        rel="noopener noreferrer"
        className={cn("underline underline-offset-2", onDark ? "text-white" : "text-brand")}
      >
        {part}
      </a>
    ) : (
      <span key={index}>{part}</span>
    ),
  );
}

/* -------------------------------------------------------------------------- */
/* Bubbles                                                                    */
/* -------------------------------------------------------------------------- */

type BubbleProps = {
  message: PublicMessage;
  mine: boolean;
  /** Admin viewing a customer thread. */
  viewer: "customer" | "admin";
  showAvatar: boolean;
};

export function MessageBubble({ message, mine, showAvatar }: BubbleProps) {
  const [lightbox, setLightbox] = useState<string | null>(null);
  const isOrder = message.kind === "order";
  const photo = mine ? message.senderPhoto : message.senderPhoto ?? (message.senderRole === "admin" ? MT_STORE.photo : null);

  const time = formatTime(message.createdAt);
  const readLabel =
    mine && message.readAt ? "Read" : mine && message.deliveredAt ? "Delivered" : mine ? "Sent" : null;

  return (
    <div className={cn("flex w-full gap-2", mine ? "justify-end" : "justify-start")}>
      {!mine ? (
        <div className="w-7 shrink-0">
          {showAvatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo ?? MT_STORE.photo} alt="" className="size-7 rounded-full object-cover" />
          ) : null}
        </div>
      ) : null}

      <div className={cn("max-w-[85%] sm:max-w-[75%]", mine ? "items-end" : "items-start")}>
        {!mine && showAvatar ? (
          <p className="mb-0.5 px-1 text-[10px] font-bold text-ink-soft">
            {message.senderRole === "admin" ? MT_STORE.name : message.senderName}
          </p>
        ) : null}

        <div
          className={cn(
            "overflow-hidden rounded-2xl text-sm shadow-sm",
            mine
              ? "rounded-br-md bg-brand text-white"
              : message.senderRole === "admin"
                ? "rounded-bl-md border border-border bg-white text-ink"
                : "rounded-bl-md bg-surface-2 text-ink",
          )}
        >
          {isOrder && message.order ? (
            <OrderCard order={message.order} mine={mine} onDark={mine} />
          ) : null}

          {message.attachment ? (
            <AttachmentView attachment={message.attachment} onOpen={setLightbox} />
          ) : null}

          {message.text && !isOrder ? (
            <p className="px-3 py-2 leading-5 whitespace-pre-wrap break-words">
              {linkify(message.text, mine)}
            </p>
          ) : null}
        </div>

        <p
          className={cn(
            "mt-0.5 flex items-center gap-1 px-1 text-[10px] text-ink-soft",
            mine ? "justify-end" : "justify-start",
          )}
        >
          {time}
          {readLabel ? <span className="text-brand">· {readLabel}</span> : null}
        </p>
      </div>

      {lightbox ? (
        <div
          role="dialog"
          aria-label="Attachment preview"
          onClick={() => setLightbox(null)}
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox} alt="" className="max-h-full max-w-full rounded-lg" />
          <button
            type="button"
            aria-label="Close preview"
            className="absolute top-4 right-4 grid size-10 place-items-center rounded-full bg-white/15 text-white"
          >
            <X className="size-5" />
          </button>
        </div>
      ) : null}
    </div>
  );
}

/**
 * The order summary card — the whole reason for the conversation.
 *
 * Prices are stored in USD (the cart's currency). They are shown exactly like
 * the cart page: our 80% discounted price, the original struck through, and
 * converted into the visitor's currency by the same helpers the cart uses.
 */
export function OrderCard({
  order,
  mine,
  onDark,
}: {
  order: OrderPayload;
  mine: boolean;
  /** White text on the brand-coloured bubble. */
  onDark: boolean;
}) {
  const { currency } = useCurrency();

  // One total in the visitor's currency. If a legacy order mixed currencies we
  // fall back to summing per currency and joining, so nothing is lost.
  const currencies = new Set(order.lines.map((line) => line.currency));
  const singleCurrency = currencies.size === 1;
  const payTotal = order.lines.reduce(
    (sum, line) => sum + storeLineTotal(line.price, line.quantity, currency),
    0,
  );
  const listTotal = order.lines.reduce(
    (sum, line) => sum + storeListPrice(line.price, currency) * line.quantity,
    0,
  );
  const saved = listTotal - payTotal;

  return (
    <div className={cn("min-w-64 p-3", mine ? "" : "bg-white")}>
      <p
        className={cn(
          "text-[10px] font-extrabold tracking-widest uppercase",
          onDark ? "text-white/70" : "text-brand",
        )}
      >
        Order {order.reference}
      </p>
      <ul className={cn("mt-2 flex flex-col gap-2.5", onDark ? "text-white" : "text-ink")}>
        {order.lines.map((line, index) => {
          const unitPay = storePrice(line.price, currency);
          const unitList = storeListPrice(line.price, currency);
          return (
            <li key={`${line.productId}-${index}`} className="flex gap-2">
              {line.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={line.image} alt="" className="size-12 shrink-0 rounded-lg bg-white object-cover" />
              ) : (
                <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-white/20">
                  <ImageIcon className="size-4" />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-xs leading-snug font-semibold">{line.title}</p>
                {line.options && Object.keys(line.options).length > 0 ? (
                  <p className={cn("text-[10px]", onDark ? "text-white/75" : "text-ink-soft")}>
                    {Object.entries(line.options)
                      .map(([key, value]) => `${key}: ${value}`)
                      .join(" · ")}
                  </p>
                ) : null}

                {/* Same price treatment as the cart: was → now. */}
                <p className="mt-0.5 flex flex-wrap items-baseline gap-x-1.5">
                  <span
                    className={cn(
                      "text-xs font-extrabold",
                      onDark ? "text-white" : "text-ink",
                    )}
                  >
                    {formatMoney(unitPay, currency)}
                  </span>
                  {unitList > unitPay ? (
                    <span
                      className={cn(
                        "text-[10px] line-through",
                        onDark ? "text-white/60" : "text-ink-soft",
                      )}
                    >
                      {formatMoney(unitList, currency)}
                    </span>
                  ) : null}
                  {unitList > unitPay ? (
                    <span className="rounded bg-save px-1 py-0.5 text-[9px] font-extrabold text-ink">
                      −{STORE_DISCOUNT_PERCENT}%
                    </span>
                  ) : null}
                </p>

                <p className={cn("text-[10px]", onDark ? "text-white/75" : "text-ink-soft")}>
                  Qty {line.quantity}
                  {line.quantity > 1
                    ? ` · ${formatMoney(unitPay * line.quantity, currency)} total`
                    : ""}
                  {line.productId ? ` · ID ${line.productId}` : ""}
                </p>
                {line.url ? (
                  <a
                    href={line.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      "inline-flex items-center gap-1 text-[10px] font-bold underline underline-offset-2",
                      onDark ? "text-white" : "text-brand",
                    )}
                  >
                    <Link2 className="size-3" /> View product
                  </a>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
      <div
        className={cn(
          "mt-2 flex items-baseline justify-between border-t pt-2 text-xs font-extrabold",
          mine ? "border-white/25 text-white" : "border-border text-ink",
        )}
      >
        <span>Total</span>
        <span className="text-right">
          {singleCurrency
            ? formatMoney(payTotal, currency)
            : Object.entries(
                order.lines.reduce<Record<string, number>>((totals, line) => {
                  totals[line.currency] =
                    (totals[line.currency] ?? 0) +
                    storeLineTotal(line.price, line.quantity, line.currency);
                  return totals;
                }, {}),
              )
                .map(([code, amount]) => formatMoney(amount, code))
                .join(" + ")}
          {singleCurrency && saved > 0 ? (
            <span className={cn("block text-[9px] font-semibold", onDark ? "text-white/60" : "text-stock")}>
              You save {formatMoney(saved, currency)}
            </span>
          ) : null}
        </span>
      </div>
    </div>
  );
}

function AttachmentView({ attachment, onOpen }: { attachment: Attachment; onOpen: (url: string) => void }) {
  const type = attachment.contentType;
  if (type.startsWith("image/")) {
    return (
      <button type="button" onClick={() => onOpen(attachment.url)} className="block w-full">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={attachment.url} alt={attachment.name} className="max-h-64 w-full object-cover" />
      </button>
    );
  }
  if (type.startsWith("video/")) {
    return <video src={attachment.url} controls className="max-h-64 w-full" />;
  }
  if (type.startsWith("audio/")) {
    return (
      <div className="flex items-center gap-2 px-3 py-2">
        <Mic className="size-4 shrink-0 opacity-70" />
        <audio src={attachment.url} controls className="h-9 w-full max-w-56" />
      </div>
    );
  }
  return (
    <a
      href={attachment.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 px-3 py-2 underline underline-offset-2"
    >
      <FileText className="size-4 shrink-0" />
      <span className="truncate text-xs">{attachment.name}</span>
    </a>
  );
}

/* -------------------------------------------------------------------------- */
/* Composer                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Message composer with attachments.
 *
 * Files are uploaded straight to Storage via a short-lived signed URL from our
 * API, so big videos never pass through the app server.
 */
export function MessageComposer({
  onSend,
  disabled,
}: {
  onSend: (input: { kind: MessageKind; text?: string; attachment?: Attachment }) => Promise<void>;
  disabled?: boolean;
}) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  async function submit() {
    const value = text.trim();
    if (!value || sending) return;
    setSending(true);
    setError(null);
    try {
      await onSend({ kind: "text", text: value });
      setText("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Couldn't send. Try again.");
    } finally {
      setSending(false);
    }
  }

  async function attach(file: File) {
    setUploading(true);
    setError(null);
    try {
      const ticket = await messageApi.uploadUrl({
        name: file.name,
        contentType: file.type || "application/octet-stream",
        size: file.size,
      });

      const put = await fetch(ticket.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!put.ok) throw new Error("Upload failed. Try a smaller file.");

      await onSend({
        kind: ticket.kind,
        text: text.trim() || undefined,
        attachment: {
          url: ticket.url,
          name: file.name,
          contentType: file.type || "application/octet-stream",
          size: file.size,
        },
      });
      setText("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Couldn't upload that file.");
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  return (
    <div className="border-t border-border bg-white p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      {error ? <p className="px-2 pb-1 text-[11px] text-destructive">{error}</p> : null}
      <div className="flex items-end gap-1.5">
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          disabled={disabled || uploading}
          aria-label="Attach a file"
          className="grid size-10 shrink-0 place-items-center rounded-full text-ink-soft transition hover:bg-surface-2 hover:text-brand disabled:opacity-50"
        >
          {uploading ? <Paperclip className="size-5 animate-pulse" /> : <Paperclip className="size-5" />}
        </button>
        <input
          ref={fileInput}
          type="file"
          hidden
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.txt"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void attach(file);
          }}
        />
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void submit();
            }
          }}
          rows={1}
          placeholder="Write a message…"
          disabled={disabled}
          className="max-h-32 min-h-10 flex-1 resize-none rounded-2xl border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/15"
        />
        <button
          type="button"
          onClick={() => void submit()}
          disabled={disabled || sending || !text.trim()}
          aria-label="Send message"
          className="grid size-10 shrink-0 place-items-center rounded-full bg-brand text-white transition hover:brightness-110 disabled:opacity-40"
        >
          <Send className="size-4" />
        </button>
      </div>
    </div>
  );
}

/** Small helper for the icons used by the file picker hint. */
export const AttachmentIcons = { ImageIcon, Video, FileText, Mic };
