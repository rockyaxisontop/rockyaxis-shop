"use client";

import { convertFromUsd, formatLocal } from "@/lib/currency";

/**
 * Canned admin replies.
 *
 * Templates are functions of the conversation's real data, so "confirm your
 * address" always quotes the customer's OWN address instead of a placeholder —
 * which is the whole point: a rep can answer in one tap without copying details.
 */
export type QuickMessageContext = {
  name: string;
  address: string;
  phone: string;
  email: string | null;
  /** Reference and amount of the latest order in this chat, if any. */
  orderReference: string | null;
  orderTotal: string | null;
  storeUrl: string;
};

export type QuickMessage = {
  id: string;
  label: string;
  group: "order" | "payment" | "profile" | "general";
  build: (context: QuickMessageContext) => string;
};

const qrPlaceholder = "eSewa / Khalti / bank QR";

export const QUICK_MESSAGES: QuickMessage[] = [
  {
    id: "order-success",
    label: "Order successful — see your cart",
    group: "order",
    build: (c) =>
      `✅ Your order${c.orderReference ? ` ${c.orderReference}` : ""} is confirmed! Open your cart to see the status of every item: ${c.storeUrl}/cart`,
  },
  {
    id: "order-status",
    label: "Check your order status",
    group: "order",
    build: (c) =>
      `You can follow every order right here in this chat, or in your cart: ${c.storeUrl}/cart — it shows which items are paid and which are still pending.`,
  },
  {
    id: "shipping-24h",
    label: "Wait 24 hours for dispatch",
    group: "order",
    build: (c) =>
      `Thanks ${c.name}! Your order is being prepared and will be dispatched within 24 hours. We'll message you here with the delivery update.`,
  },
  {
    id: "pay-now",
    label: "Pay now to confirm",
    group: "payment",
    build: (c) =>
      `To confirm${c.orderReference ? ` order ${c.orderReference}` : " your order"}, please send ${c.orderTotal ?? "the amount shown in the order above"} to our ${qrPlaceholder}. Reply with a screenshot of the payment and we'll dispatch right away. 🚚`,
  },
  {
    id: "send-amount-qr",
    label: "Send the amount to this QR",
    group: "payment",
    build: (c) =>
      `Please send exactly ${c.orderTotal ?? "the order total"} to this QR (${qrPlaceholder}). Your product will be delivered to the address saved in your profile: ${c.address || "no address saved yet"}.`,
  },
  {
    id: "confirm-address",
    label: "Confirm your address",
    group: "profile",
    build: (c) =>
      `Can you confirm this is the right delivery address?\n\n📍 ${c.address || "No address saved yet"}\n📞 ${c.phone || "No phone number saved"}\n\nReply YES to confirm, or update it at ${c.storeUrl}/profile`,
  },
  {
    id: "complete-profile",
    label: "Complete your profile first",
    group: "profile",
    build: (c) =>
      `Before we can place your order we need your delivery details (name, phone and full address). You can add them here: ${c.storeUrl}/profile — tap the profile icon at the top of the chat. Then tell us here and we'll proceed.`,
  },
  {
    id: "profile-missing",
    label: "Things missing in your profile",
    group: "profile",
    build: (c) =>
      `Your profile is nearly ready, ${c.name}. Please check that your phone number and full address are filled in: ${c.storeUrl}/profile. Anything missing there will block delivery.`,
  },
  {
    id: "thanks",
    label: "Thanks — anything else?",
    group: "general",
    build: (c) => `Thanks for chatting with MT Store, ${c.name}! Is there anything else I can help you with? 😊`,
  },
  {
    id: "out-of-stock",
    label: "Out of stock — alternative?",
    group: "general",
    build: () =>
      `Sorry, that product is currently out of stock. Would you like me to suggest a similar item that is available right now?`,
  },
];

/** Builds the live context from data the admin panel already has. */
export function buildContext(input: {
  name: string;
  address?: string;
  phone?: string;
  email?: string | null;
  orderReference?: string | null;
  /** Raw order total in the stored (USD) currency — formatted per visitor. */
  orderTotalUsd?: number | null;
  /** Currency to render the total in, e.g. "NPR" from useCurrency(). */
  currency: string;
}): QuickMessageContext {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return {
    name: (input.name || "there").split(" ")[0],
    address: input.address ?? "",
    phone: input.phone ?? "",
    email: input.email ?? null,
    orderReference: input.orderReference ?? null,
    // Same formatter as the cart, so a quote in a message matches the cart exactly.
    orderTotal:
      input.orderTotalUsd != null
        ? formatLocal(convertFromUsd(input.orderTotalUsd, input.currency), input.currency)
        : null,
    storeUrl: origin,
  };
}
