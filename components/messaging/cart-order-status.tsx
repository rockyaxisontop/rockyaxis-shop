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

  const refresh = useCallback(async () => {
    try {
      const { orders: list } = await messageApi.orders();
      setOrders(list);
    } catch {
      /* the cart must keep working even if this call fails */
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 15000);
    return () => clearInterval(timer);
  }, [refresh]);

  /** The newest order containing this exact cart row, if any. */
  const forLine = (lineKey: string): ChatOrder | undefined =>
    orders.find((order) => order.lineIds.includes(lineKey));

  return { orders, forLine, refresh };
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

  const confirmed = orders.filter((order) => order.status === "confirmed").length;
  const allDone = confirmed === orders.length;

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold",
        allDone ? "border-stock/40 bg-stock-bg text-stock" : "border-[#f36d25]/30 bg-[#fff6ef] text-[#b34a12]",
      )}
    >
      {allDone ? <CheckCircle2 className="size-4 shrink-0" /> : <Clock3 className="size-4 shrink-0" />}
      {allDone
        ? `All ${orders.length} order${orders.length === 1 ? "" : "s"} confirmed — we're preparing them.`
        : `${confirmed} of ${orders.length} order${orders.length === 1 ? "" : "s"} confirmed. The rest are being reviewed in your chat.`}
    </div>
  );
}
