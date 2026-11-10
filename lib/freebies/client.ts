"use client";

import { auth } from "@/lib/firebase/client";
import type { FreebieOrder, PublicCampaign } from "./types";

async function call<T>(path: string, init?: RequestInit, { public: isPublic = false } = {}): Promise<T> {
  const user = auth.currentUser;
  if (!user && !isPublic) throw new Error("Sign in to continue.");

  const token = user ? await user.getIdToken() : null;
  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });

  const body = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) throw new Error(body.error ?? "Something went wrong.");
  return body as T;
}

export const freebieApi = {
  listCampaigns: () => call<{ campaigns: PublicCampaign[] }>("/api/freebies/campaigns"),

  startCampaign: (productId: string) =>
    call<{ campaign: PublicCampaign }>("/api/freebies/campaigns", {
      method: "POST",
      body: JSON.stringify({ productId }),
    }),

  /** Public: works signed-out so a referral link can be previewed. */
  getCampaign: (code: string) =>
    call<{ campaign: PublicCampaign }>(
      `/api/freebies/campaigns/${encodeURIComponent(code)}`,
      undefined,
      { public: true },
    ),

  claim: (code: string) =>
    call<{ campaign: PublicCampaign; counted: boolean; reason?: string }>("/api/freebies/claim", {
      method: "POST",
      body: JSON.stringify({ code }),
    }),

  placeOrder: (campaignId: string) =>
    call<{ order: FreebieOrder }>("/api/freebies/orders", {
      method: "POST",
      body: JSON.stringify({ campaignId }),
    }),

  listOrders: () => call<{ orders: FreebieOrder[] }>("/api/freebies/orders"),
};
