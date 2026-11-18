"use client";

import { useEffect, useState } from "react";
import { Download, Share, SquarePlus, X } from "lucide-react";

/** Chrome/Edge fire this; it is not in the DOM typings, so it is declared here. */
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "mt-store:install-dismissed";

/**
 * Offers to install the shop as an app.
 *
 * - Chrome/Edge/Android: uses the browser's own install prompt via the
 *   `beforeinstallprompt` event.
 * - iOS Safari has no install API, so it gets the Share → Add to Home Screen
 *   instructions instead.
 * - The prompt never appears when the app is already installed, and a dismissal
 *   is remembered so it can't nag.
 */
export function InstallPrompt() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Hidden when already installed (standalone) or previously dismissed.
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (standalone) return;
    try {
      if (localStorage.getItem(DISMISS_KEY) === "1") return;
    } catch {
      /* storage blocked — still fine to show */
    }

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);

    // iOS: no event exists, so detect Safari on iOS and show our own hint.
    const ua = window.navigator.userAgent;
    const isIos = /iphone|ipad|ipod/i.test(ua);
    const isSafari = /safari/i.test(ua) && !/chrome|crios|fxios|edgios/i.test(ua);
    if (isIos && isSafari) {
      setShowIosHint(true);
      // Give the page a moment before asking.
      const timer = setTimeout(() => setVisible(true), 6000);
      return () => {
        clearTimeout(timer);
        window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      };
    }

    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  function dismiss() {
    setVisible(false);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
  }

  async function install() {
    if (!installEvent) return;
    await installEvent.prompt();
    await installEvent.userChoice;
    setInstallEvent(null);
    dismiss();
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Install MT Store"
      className="fixed inset-x-3 bottom-3 z-[70] mx-auto flex max-w-md items-start gap-3 rounded-2xl border border-border bg-white p-3 shadow-2xl shadow-black/20 sm:left-4 sm:right-auto sm:mx-0"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icon-192.png" alt="" width={44} height={44} className="size-11 shrink-0 rounded-xl" />

      <div className="min-w-0 flex-1">
        <p className="text-sm font-extrabold text-ink">Install MT Store</p>
        {showIosHint ? (
          <p className="mt-1 flex flex-wrap items-center gap-1 text-[11px] leading-4 text-ink-soft">
            Tap <Share className="size-3.5 text-brand" /> Share, then
            <SquarePlus className="size-3.5 text-brand" /> Add to Home Screen.
          </p>
        ) : (
          <p className="mt-0.5 text-[11px] leading-4 text-ink-soft">
            Faster shopping, straight from your home screen.
          </p>
        )}

        {!showIosHint ? (
          <button
            type="button"
            onClick={() => void install()}
            className="mt-2 inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand px-3 text-xs font-extrabold text-white transition hover:brightness-110"
          >
            <Download className="size-3.5" />
            Install app
          </button>
        ) : null}
      </div>

      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss install prompt"
        className="grid size-7 shrink-0 place-items-center rounded-full text-ink-soft transition hover:bg-surface-2 hover:text-ink"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
