"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Download, FileText, ImageIcon, Link2, Loader2, Mic, Reply, Video, X } from "lucide-react";

import { messageApi, adminApi } from "@/lib/messaging/client";
import { useCurrency } from "@/components/currency-provider";
import { STORE_DISCOUNT_PERCENT, storeLineTotal, storeListPrice, storePrice } from "@/lib/discount";
import { formatMoney } from "@/lib/format";
import type { Attachment, ChatOrderStatus, OrderPayload, PublicMessage } from "@/lib/messaging/types";
import { cn } from "@/lib/utils";

/** Official MT Store identity, shown exactly like WhatsApp's business account. */
export const MT_STORE = {
  name: "MT Store",
  // Square brand avatar built from the real logo (see scripts/generate-icons.mjs).
  photo: "/mt-store-avatar.png",
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
      // A confirmed copy replaces its optimistic twin (same clientId).
      const confirmed = new Set(incoming.map((m) => m.clientId).filter(Boolean));
      for (const [id, message] of map) {
        if (message.id.startsWith("optimistic-") && message.clientId && confirmed.has(message.clientId)) {
          map.delete(id);
        }
      }
      return [...map.values()].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
    });
  }, []);

  /**
   * Shows a message immediately while the request is in flight.
   * The returned id is replaced once the server copy arrives, so the customer
   * never waits 1–2 seconds for their own text to appear.
   */
  const sendOptimistic = useCallback(
    (draft: Omit<PublicMessage, "id" | "createdAt" | "deliveredAt" | "readAt">) => {
      const clientId = `c-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const optimistic: PublicMessage = {
        ...draft,
        id: `optimistic-${clientId}`,
        clientId,
        createdAt: new Date().toISOString(),
        deliveredAt: null,
        readAt: null,
      };
      merge([optimistic]);
      return clientId;
    },
    [merge],
  );

  /** Removes a draft whose send failed. */
  const dropOptimistic = useCallback((clientId: string) => {
    setMessages((current) => current.filter((m) => !(m.id.startsWith("optimistic-") && m.clientId === clientId)));
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

  return { messages, loading, error, hasMore, loadOlder, merge, sendOptimistic, dropOptimistic };
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
  /** Called when the viewer chooses to reply to this message. */
  onReply?: (message: PublicMessage) => void;
  /** Admin: current status of this order, if it is an order message. */
  orderStatus?: ChatOrderStatus;
  /** Admin: change that status. */
  onOrderStatusChange?: (reference: string, next: ChatOrderStatus) => Promise<void>;
};

export function MessageBubble({
  message,
  mine,
  showAvatar,
  onReply,
  orderStatus,
  onOrderStatusChange,
}: BubbleProps) {
  const [lightbox, setLightbox] = useState<{ url: string; name: string } | null>(null);
  const isOrder = message.kind === "order";
  const photo = mine ? message.senderPhoto : message.senderPhoto ?? (message.senderRole === "admin" ? MT_STORE.photo : null);

  // Long-press (600ms) on touch, double-click on desktop — the Messenger habit.
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function startPress() {
    if (!onReply) return;
    pressTimer.current = setTimeout(() => onReply(message), 600);
  }
  function endPress() {
    if (pressTimer.current) clearTimeout(pressTimer.current);
    pressTimer.current = null;
  }

  const time = formatTime(message.createdAt);
  const readLabel =
    mine && message.readAt ? "Read" : mine && message.deliveredAt ? "Delivered" : mine ? "Sent" : null;

  return (
    <div className={cn("group flex w-full items-end gap-1", mine ? "justify-end" : "justify-start")}>
      {mine && onReply ? (
        <button
          type="button"
          onClick={() => onReply(message)}
          aria-label="Reply to this message"
          title="Reply"
          className="mb-4 grid size-7 shrink-0 place-items-center rounded-full text-ink-soft opacity-60 transition hover:bg-surface-2 hover:text-brand focus-visible:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
        >
          <Reply className="size-3.5" />
        </button>
      ) : null}

      {!mine ? (
        <div className="flex w-7 shrink-0 grow-0 self-end">
          {showAvatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photo ?? MT_STORE.photo}
              alt="MT Store"
              width={28}
              height={28}
              className="block size-7 shrink-0 rounded-full border border-border bg-white object-cover"
              style={{ width: 28, height: 28, minWidth: 28, minHeight: 28, aspectRatio: "1 / 1" }}
            />
          ) : null}
        </div>
      ) : null}

      <div className={cn("min-w-0 max-w-[85%] sm:max-w-[75%]", mine ? "items-end" : "items-start")}>
        {!mine && showAvatar ? (
          <p className="mb-0.5 px-1 text-[10px] font-bold text-ink-soft">
            {message.senderRole === "admin" ? MT_STORE.name : message.senderName}
          </p>
        ) : null}

        <div
          onPointerDown={startPress}
          onPointerUp={endPress}
          onPointerLeave={endPress}
          onDoubleClick={() => onReply?.(message)}
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
            <OrderCard
              order={message.order}
              mine={mine}
              onDark={mine}
              status={orderStatus}
              onStatusChange={
                onOrderStatusChange
                  ? (next) => onOrderStatusChange(message.order!.reference, next)
                  : undefined
              }
            />
          ) : null}

          {/* Quoted message this one answers. */}
          {message.replyTo ? (
            <div
              className={cn(
                "mx-2 mt-2 rounded-lg border-l-2 px-2 py-1 text-[11px]",
                mine ? "border-white/80 bg-white/15 text-white/90" : "border-brand bg-brand-tint text-ink-soft",
              )}
            >
              <p className="text-[10px] font-bold">{message.replyTo.senderName}</p>
              <p className="line-clamp-2">
                {message.replyTo.kind === "order" ? "Order details" : message.replyTo.snippet || "Message"}
              </p>
            </div>
          ) : null}

          {message.attachment ? (
            <AttachmentView
              attachment={message.attachment}
              onOpen={(url) =>
                setLightbox({
                  url,
                  name: message.attachment?.name || `mt-store-${message.id}.jpg`,
                })
              }
            />
          ) : null}

          {message.text && !isOrder ? (
            <p className="px-3 py-2 leading-5 whitespace-pre-wrap break-words">
              {linkify(message.text, mine)}
            </p>
          ) : null}
        </div>

        <p
          className={cn(
            "mt-0.5 flex flex-wrap items-center gap-1 px-1 text-[10px] text-ink-soft",
            mine ? "justify-end" : "justify-start",
          )}
        >
          {time}
          {readLabel ? <span className="text-brand">· {readLabel}</span> : null}
        </p>
      </div>

      {!mine && onReply ? (
        <button
          type="button"
          onClick={() => onReply(message)}
          aria-label="Reply to this message"
          title="Reply"
          className="mb-4 grid size-7 shrink-0 place-items-center rounded-full text-ink-soft opacity-60 transition hover:bg-surface-2 hover:text-brand focus-visible:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
        >
          <Reply className="size-3.5" />
        </button>
      ) : null}

      {lightbox ? (
        <div
          role="dialog"
          aria-label="Attachment preview"
          onClick={() => setLightbox(null)}
          className="fixed inset-0 z-[80] flex flex-col items-center justify-center gap-3 bg-black/85 p-4"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox.url}
            alt={lightbox.name}
            className="max-h-[calc(100dvh-8rem)] max-w-full rounded-lg object-contain"
            onClick={(event) => event.stopPropagation()}
          />

          <div className="flex items-center gap-2" onClick={(event) => event.stopPropagation()}>
            <a
              href={lightbox.url}
              download={lightbox.name || "mt-store-image"}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-white px-4 text-sm font-bold text-ink shadow-lg"
            >
              <Download className="size-4" />
              Save image
            </a>
            <button
              type="button"
              onClick={() => setLightbox(null)}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-white/15 px-4 text-sm font-bold text-white"
            >
              <X className="size-4" />
              Close
            </button>
          </div>

          <button
            type="button"
            onClick={() => setLightbox(null)}
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
  status,
  onStatusChange,
}: {
  order: OrderPayload;
  mine: boolean;
  /** White text on the brand-coloured bubble. */
  onDark: boolean;
  status?: ChatOrderStatus;
  /** Admin only: mark the order accepted / successful / cancelled. */
  onStatusChange?: (next: ChatOrderStatus) => Promise<void> | void;
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
      {status ? (
        <div className="mt-1">
          <OrderStatusBadge status={status} />
        </div>
      ) : null}
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
                {line.productId ? (
                  <Link
                    href={`/products/${encodeURIComponent(line.productId)}`}
                    className={cn(
                      "inline-flex items-center gap-1 text-[10px] font-bold underline underline-offset-2",
                      onDark ? "text-white" : "text-brand",
                    )}
                  >
                    <Link2 className="size-3" /> View product
                  </Link>
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

      {/* Admin's actions live on the order itself, inside the conversation. */}
      {onStatusChange && status ? (
        <div className={cn("mt-2 flex flex-wrap gap-1.5 border-t pt-2", onDark ? "border-white/25" : "border-border")}>
          {status === "sent" ? (
            <StatusAction label="Accept order" onClick={() => onStatusChange("awaiting_payment")} />
          ) : null}
          {status !== "confirmed" && status !== "cancelled" ? (
            <StatusAction
              label="Order success ✓"
              tone="success"
              onClick={() => onStatusChange("confirmed")}
            />
          ) : null}
          {status !== "confirmed" && status !== "cancelled" ? (
            <StatusAction label="Cancel" tone="danger" onClick={() => onStatusChange("cancelled")} />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

const STATUS_LABELS: Record<ChatOrderStatus, { label: string; className: string }> = {
  sent: { label: "Order placed", className: "bg-[#fff1e5] text-[#b34a12]" },
  awaiting_payment: { label: "Awaiting payment", className: "bg-brand-tint text-brand" },
  confirmed: { label: "Order success", className: "bg-stock-bg text-stock" },
  cancelled: { label: "Cancelled", className: "bg-surface-2 text-ink-soft" },
};

/** Status pill shared by the chat, the cart and the admin panel. */
export function OrderStatusBadge({ status }: { status: ChatOrderStatus }) {
  const meta = STATUS_LABELS[status] ?? STATUS_LABELS.sent;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-extrabold tracking-wide uppercase",
        meta.className,
      )}
    >
      {status === "confirmed" ? <CheckCircle2 className="size-3" /> : null}
      {meta.label}
    </span>
  );
}

function StatusAction({
  label,
  onClick,
  tone = "default",
}: {
  label: string;
  onClick: () => Promise<void> | void;
  tone?: "default" | "success" | "danger";
}) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => {
        setBusy(true);
        Promise.resolve(onClick())
          .catch(() => {})
          .finally(() => setBusy(false));
      }}
      className={cn(
        "inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-[10px] font-extrabold transition disabled:opacity-50",
        tone === "success"
          ? "bg-stock text-white hover:brightness-110"
          : tone === "danger"
            ? "border border-border text-ink-soft hover:border-destructive/40 hover:text-destructive"
            : "bg-brand text-white hover:brightness-110",
      )}
    >
      {busy ? <Loader2 className="size-3 animate-spin" /> : null}
      {label}
    </button>
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

/** Small helper for the icons used by the file picker hint. */
export const AttachmentIcons = { ImageIcon, Video, FileText, Mic };
