"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

const DISMISS_KEY = "mt-store:install-banner-dismissed";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/**
 * "Install MT Store" banner, shown only after the customer has actually used
 * the chat (2+ open messages). Asking before the first reply feels pushy; by
 * then they have a reason to keep it on the home screen.
 */
export function InstallAppBanner({ messageCount }: { messageCount: number }) {
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(true);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Already installed? The banner must never appear.
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (standalone) setInstalled(true);

    try {
      setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
    } catch {
      setDismissed(false);
    }

    const onPrompt = (promptEvent: Event) => {
      promptEvent.preventDefault();
      setEvent(promptEvent as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (installed || dismissed || messageCount < 2) return null;

  async function install() {
    if (event) {
      await event.prompt();
      await event.userChoice;
      setEvent(null);
    }
    dismiss();
  }

  function dismiss() {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="flex items-center gap-2 border-t border-border bg-brand-tint px-3 py-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icon-192.png" alt="" className="size-9 shrink-0 rounded-lg" />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-extrabold text-ink">Install MT Store</p>
        <p className="text-[10px] leading-tight text-ink-soft">
          Keep your chat and get notified instantly.
        </p>
      </div>
      <button
        type="button"
        onClick={() => void install()}
        className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg bg-brand px-2.5 text-[11px] font-extrabold text-white"
      >
        <Download className="size-3" />
        Install
      </button>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss install banner"
        className="grid size-7 shrink-0 place-items-center rounded-full text-ink-soft hover:bg-white"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
