"use client";

import { auth } from "@/lib/firebase/client";

import type {
  AdminCustomerProfile,
  AdminStats,
  Attachment,
  MessageKind,
  OrderPayload,
  PublicConversation,
  PublicMessage,
  ReplyPreview,
} from "./types";

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const user = auth.currentUser;
  if (!user) throw new Error("Sign in to continue.");

  const token = await user.getIdToken();
  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...init?.headers,
    },
  });

  const body = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) throw new Error(body.error ?? "Something went wrong.");
  return body as T;
}

export type SendInput = {
  kind: MessageKind;
  text?: string;
  attachment?: Attachment;
  order?: OrderPayload;
  /** Set when answering a specific message. */
  replyTo?: ReplyPreview;
};

/** Customer-side messaging API. */
export const messageApi = {
  getConversation: () => call<{ conversation: PublicConversation }>("/api/messages/conversation"),

  listMessages: (before?: string) =>
    call<{ messages: PublicMessage[] }>(
      `/api/messages/conversation/messages${before ? `?before=${encodeURIComponent(before)}` : ""}`,
    ),

  send: (input: SendInput) =>
    call<{ message: PublicMessage }>("/api/messages/conversation/messages", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  /** Sends the cart (or selected cart rows) as an order message. */
  sendOrder: (cartIds?: string[]) =>
    call<{ message: PublicMessage; duplicated: boolean; conversationId: string }>("/api/messages/order", {
      method: "POST",
      body: JSON.stringify({ cartIds }),
    }),

  markRead: () => call<{ ok: true }>("/api/messages/read", { method: "POST" }),

  uploadUrl: (file: { name: string; contentType: string; size: number }) =>
    call<
      | { provider: "cloudinary"; uploadUrl: string; fields: Record<string, string>; fileName: string; kind: MessageKind }
      | { provider: "storage"; uploadUrl: string; url: string; path: string; kind: MessageKind }
    >("/api/messages/upload-url", { method: "POST", body: JSON.stringify(file) }),
};

/** Admin-side messaging API. */
export const adminApi = {
  me: () => call<{ admin: { uid: string; email: string; role: "admin" } }>("/api/admin/me"),

  conversations: () =>
    call<{ conversations: PublicConversation[]; stats: AdminStats }>("/api/admin/conversations"),

  messages: (uid: string, before?: string) =>
    call<{ messages: PublicMessage[] }>(
      `/api/admin/conversations/${encodeURIComponent(uid)}/messages${before ? `?before=${encodeURIComponent(before)}` : ""}`,
    ),

  reply: (uid: string, input: SendInput) =>
    call<{ message: PublicMessage }>(`/api/admin/conversations/${encodeURIComponent(uid)}/messages`, {
      method: "POST",
      body: JSON.stringify(input),
    }),

  markRead: (uid: string) =>
    call<{ ok: true }>(`/api/admin/conversations/${encodeURIComponent(uid)}/read`, { method: "POST" }),

  /** Full profile the customer filled in, plus their orders. */
  profile: (uid: string) =>
    call<AdminCustomerProfile>(`/api/admin/conversations/${encodeURIComponent(uid)}/profile`),
};
