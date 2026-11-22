"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, BellRing, Loader2 } from "lucide-react";

import { enablePush, getPushStatus, type PushStatus } from "@/lib/messaging/push-client";
import { cn } from "@/lib/utils";

/**
 * One-tap "enable notifications" control, used by both the customer chat header
 * and the admin dashboard. It never prompts on its own — only on a click.
 */
export function EnablePushButton({ className }: { className?: string }) {
  const [status, setStatus] = useState<PushStatus | "loading">("loading");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void getPushStatus().then(setStatus);
  }, []);

  async function turnOn() {
    setBusy(true);
    setError(null);
    const result = await enablePush();
    if (result.ok) setStatus("granted");
    else setError(result.error ?? "Couldn't enable notifications.");
    setBusy(false);
  }

  if (status === "loading") return null;

  if (status === "unsupported") {
    return (
      <span
        title="This browser doesn't support push notifications"
        className={cn("inline-flex items-center gap-1.5 text-[10px] text-ink-soft", className)}
      >
        <BellOff className="size-3.5" />
        No push support
      </span>
    );
  }

  if (status === "granted") {
    return (
      <span className={cn("inline-flex items-center gap-1.5 text-[10px] font-bold text-stock", className)}>
        <BellRing className="size-3.5" />
        Notifications on
      </span>
    );
  }

  if (status === "denied") {
    return (
      <span
        title="Blocked in your browser settings — allow notifications for this site to turn them on"
        className={cn("inline-flex items-center gap-1.5 text-[10px] font-bold text-ink-soft", className)}
      >
        <BellOff className="size-3.5" />
        Notifications blocked
      </span>
    );
  }

  return (
    <span className={cn("inline-flex flex-col items-start", className)}>
      <button
        type="button"
        onClick={() => void turnOn()}
        disabled={busy}
        className="inline-flex items-center gap-1.5 rounded-lg border border-brand/40 bg-brand-tint px-2 py-1 text-[10px] font-extrabold text-brand transition hover:border-brand disabled:opacity-60"
      >
        {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Bell className="size-3.5" />}
        {busy ? "Enabling…" : "Enable notifications"}
      </button>
      {error ? <span className="mt-0.5 text-[10px] text-destructive">{error}</span> : null}
    </span>
  );
}
