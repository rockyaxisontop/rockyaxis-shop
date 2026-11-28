"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";

import { useAuth } from "@/components/providers";
import { askForPushOnce, getPushStatus } from "@/lib/messaging/push-client";

/**
 * Offers browser notifications to signed-in shoppers anywhere on the site.
 *
 * This is the "no app install needed" path: once the browser permission is
 * granted, web push delivers MT Store's replies to the desktop or phone
 * notification area even when the tab is closed. Nothing is installed.
 *
 * Deliberately quiet:
 *   • only when signed in, and only once per device (its own dismissal key);
 *   • the browser prompt fires on the visitor's first click, because browsers
 *     ignore permission requests that arrive without a user gesture;
 *   • never shown on the chat page, which asks for real instead.
 *
 * It does NOT set the shared `mt-store:push-asked` flag: dismissing this nudge
 * must not stop the chat page from asking, since the chat is where the customer
 * actually wants replies.
 */
const DISMISS_KEY = "mt-store:push-nudge-dismissed";

export function NotificationNudge() {
  const { user } = useAuth();
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!user || pathname === "/message") return;

    let cancelled = false;
    void (async () => {
      try {
        if (localStorage.getItem(DISMISS_KEY) === "1") return;
        if (localStorage.getItem("mt-store:push-asked")) return;
        const status = await getPushStatus();
        if (cancelled) return;
        // "default" = never asked. Granted/denied/unsupported need no prompt.
        if (status === "default") setVisible(true);
      } catch {
        /* notifications unavailable */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, pathname]);

  // Arm the one-shot request while the nudge is on screen; it fires on the
  // visitor's next click or keypress, which is what browsers require.
  useEffect(() => {
    if (!visible) return;
    // `remember: false` on purpose — see NotificationNudge's docblock.
    return askForPushOnce(() => setVisible(false), { remember: false });
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-md rounded-2xl border border-border bg-white p-3 shadow-lg sm:inset-x-auto sm:right-4 sm:bottom-4">
      <div className="flex items-start gap-3">
        <span aria-hidden className="mt-0.5 text-xl leading-none">
          🔔
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink">Get replies without installing anything</p>
          <p className="mt-0.5 text-xs leading-snug text-ink-soft">
            Allow browser notifications and MT Store&apos;s messages arrive on your device — even
            when this tab is closed.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            try {
              localStorage.setItem(DISMISS_KEY, "1");
            } catch {
              /* ignore */
            }
            setVisible(false);
          }}
          aria-label="Dismiss"
          className="grid size-6 shrink-0 place-items-center rounded-full text-ink-soft transition hover:bg-surface-2 hover:text-ink"
        >
          <X className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
