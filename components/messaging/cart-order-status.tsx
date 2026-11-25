"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Clock3, ShoppingBag } from "lucide-react";

import { messageApi } from "@/lib/messaging/client";
import type { ChatOrder, ChatOrderStatus } from "@/lib/messaging/types";
import { cn } from "@/lib/utils";

/**
 * Per-product order state for the cart and checkout pages.
 *
 * A cart line counts as "in an order" when it was part of an order message. The
 * status then follows the admin's decision in the chat, so the customer sees
 * exactly where things stand without opening the conversation.
 */
export function useCartOrderState() {
  const [orders, setOrders] = useState<ChatOrder[]>([]);
  const [failed, setFailed] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const { orders: list } = await messageApi.orders();
      setOrders(list);
      setFailed(false);
    } catch {
      // Surfaced to the UI so the customer isn't left guessing, but the cart
      // itself must keep working.
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    void refresh();
    // 20s rather than 5s: this runs on both the cart and checkout pages, and
    // polling that often is what exhausted the Firestore quota. Status also
    // refreshes on tab focus, which covers the realistic case.
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 20000);

    const onWake = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    window.addEventListener("focus", onWake);
    document.addEventListener("visibilitychange", onWake);

    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", onWake);
      document.removeEventListener("visibilitychange", onWake);
    };
  }, [refresh]);

  /** The newest order containing this exact cart row, if any. */
  const forLine = (lineKey: string): ChatOrder | undefined =>
    orders
      .filter((order) => order.status !== "cancelled" && order.lineIds.includes(lineKey))
      .sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""))[0];

  /** Statuses that mean the row has been bought and the money is settled. */
  const PAID: ChatOrderStatus[] = ["confirmed"];
  /** Statuses where an order exists but the money is still owed. */
  const IN_PROGRESS: ChatOrderStatus[] = ["sent", "awaiting_payment"];

  /**
   * PAID: the row was bought and the order is settled (`confirmed` / delivered).
   *
   * Only these are excluded from the cart/checkout money — the customer has
   * already paid for them, so charging again would double-bill. They are also
   * the only rows that show "View order".
   */
  const isPaid = (lineKey: string) =>
    orders.some((order) => PAID.includes(order.status) && order.lineIds.includes(lineKey));

  /**
   * IN PROGRESS: an order exists but is not paid yet (`sent` /
   * `awaiting_payment`). These are still counted in the total — the customer
   * still has to pay them — but they cannot be re-ordered or re-sent.
   */
  const isInProgress = (lineKey: string) =>
    orders.some(
      (order) => IN_PROGRESS.includes(order.status) && order.lineIds.includes(lineKey),
    );

  /**
   * LOCKED: no new order can be created for this row. Covers both paid and
   * in-progress; only `cancelled` frees a row again.
   */
  const isOrdered = (lineKey: string) => isPaid(lineKey) || isInProgress(lineKey);

  /** The order a row belongs to — used to deep-link "view order details". */
  const orderFor = (lineKey: string): ChatOrder | undefined =>
    orders.find((order) => order.status !== "cancelled" && order.lineIds.includes(lineKey));

  return { orders, forLine, isPaid, isInProgress, isOrdered, orderFor, failed, refresh };
}

/** Key the server uses to match a cart row to its order line. */
export function cartLineKey(productId: string, options?: Record<string, string>) {
  return `${productId}|${JSON.stringify(options ?? {})}`;
}

const META: Record<ChatOrderStatus, { label: string; className: string; icon: typeof Clock3 }> = {
  sent: { label: "Order sent · waiting for confirmation", className: "bg-[#fff1e5] text-[#b34a12]", icon: Clock3 },
  awaiting_payment: { label: "Accepted · payment requested", className: "bg-brand-tint text-brand", icon: ShoppingBag },
  confirmed: { label: "Order success", className: "bg-stock-bg text-stock", icon: CheckCircle2 },
  cancelled: { label: "Order cancelled", className: "bg-surface-2 text-ink-soft", icon: Clock3 },
};

/** Compact inline pill for a cart row. */
export function CartOrderStatus({
  status,
  className,
}: {
  status: ChatOrderStatus;
  className?: string;
}) {
  const meta = META[status];
  const Icon = meta.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold",
        meta.className,
        className,
      )}
    >
      <Icon className="size-3" aria-hidden />
      {meta.label}
    </span>
  );
}

/** Summary above the cart/checkout: everything done, or what's still pending. */
export function CartOrderSummary({ orders }: { orders: ChatOrder[] }) {
  if (orders.length === 0) return null;

  const confirmed = orders.filter((order) => order.status === "confirmed");
  const pending = orders.filter((order) => order.status === "sent" || order.status === "awaiting_payment");
  const cancelled = orders.filter((order) => order.status === "cancelled");
  const allDone = pending.length === 0 && cancelled.length === 0 && confirmed.length > 0;

  return (
    <div
      className={cn(
        "rounded-xl border px-3 py-2.5 text-xs",
        allDone ? "border-stock/40 bg-stock-bg text-stock" : "border-[#f36d25]/30 bg-[#fff6ef] text-[#b34a12]",
      )}
    >
      <p className="flex items-center gap-2 font-bold">
        {allDone ? <CheckCircle2 className="size-4 shrink-0" /> : <Clock3 className="size-4 shrink-0" />}
        {allDone
          ? `All ${confirmed.length} order${confirmed.length === 1 ? "" : "s"} confirmed — we're preparing them.`
          : `${confirmed.length} of ${orders.length} order${orders.length === 1 ? "" : "s"} confirmed.`}
      </p>

      {/* Which ones are paid, which are still being reviewed, which failed. */}
      {!allDone ? (
        <ul className="mt-1.5 space-y-0.5 text-[11px]">
          {confirmed.length > 0 ? (
            <li className="flex items-center gap-1.5">
              <CheckCircle2 className="size-3 shrink-0" />
              Paid: {confirmed.map((order) => order.reference).join(", ")}
            </li>
          ) : null}
          {pending.length > 0 ? (
            <li className="flex items-center gap-1.5">
              <Clock3 className="size-3 shrink-0" />
              Waiting in chat: {pending.map((order) => order.reference).join(", ")}
            </li>
          ) : null}
          {cancelled.length > 0 ? (
            <li className="flex items-center gap-1.5">
              <Clock3 className="size-3 shrink-0" />
              Cancelled: {cancelled.map((order) => order.reference).join(", ")}
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}
