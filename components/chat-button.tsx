"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageCircle } from "lucide-react";

import { cn } from "@/lib/utils";
import { useAuth } from "@/components/providers";

/**
 * Chat entry point in the site header, with an unread badge.
 *
 * The count comes from the existing conversation API (the same one the chat page
 * uses), so no new endpoint and no client-side Firestore access is needed — this
 * project deliberately keeps Firestore server-only.
 *
 * Read cost is kept deliberately low:
 *   • one request when the tab becomes visible, not a poll on a timer;
 *   • nothing at all while the tab is hidden or the visitor is signed out;
 *   • nothing while they are already reading the chat.
 */
const MIN_INTERVAL_MS = 30_000;

export function ChatButton({ className }: { className?: string }) {
  const { user } = useAuth();
  const pathname = usePathname();
  const [unread, setUnread] = useState(0);
  const onChatPage = pathname === "/message";

  const refresh = useCallback(async () => {
    if (!user) {
      setUnread(0);
      return;
    }
    try {
      const { auth } = await import("@/lib/firebase/client");
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;
      const response = await fetch("/api/messages/conversation", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) return;
      const body = (await response.json()) as { conversation?: { unreadForCustomer?: number } };
      const value = body.conversation?.unreadForCustomer;
      setUnread(typeof value === "number" && value > 0 ? value : 0);
    } catch {
      /* messenger unavailable — the icon still works, just without a badge */
    }
  }, [user]);

  useEffect(() => {
    if (!user || onChatPage) {
      if (!user) setUnread(0);
      return;
    }

    let last = 0;
    const maybeRefresh = () => {
      if (document.visibilityState !== "visible") return;
      const now = Date.now();
      if (now - last < MIN_INTERVAL_MS) return;
      last = now;
      void refresh();
    };

    maybeRefresh();
    document.addEventListener("visibilitychange", maybeRefresh);
    window.addEventListener("focus", maybeRefresh);
    return () => {
      document.removeEventListener("visibilitychange", maybeRefresh);
      window.removeEventListener("focus", maybeRefresh);
    };
  }, [user, onChatPage, refresh]);

  const label = unread > 0 ? `Messages, ${unread} unread` : "Messages";

  return (
    <Link
      href="/message"
      aria-label={label}
      title={label}
      className={cn(
        "relative grid size-9 shrink-0 place-items-center rounded-lg border border-border text-ink transition-colors hover:bg-surface-2 hover:text-brand",
        className,
      )}
    >
      <MessageCircle className="size-4" />
      {unread > 0 ? (
        <span
          aria-hidden
          className="absolute -top-1.5 -right-1.5 grid min-w-[18px] place-items-center rounded-full bg-[#e53935] px-1 text-[10px] leading-[18px] font-bold text-white ring-2 ring-white"
        >
          {unread > 9 ? "9+" : unread}
        </span>
      ) : null}
    </Link>
  );
}
