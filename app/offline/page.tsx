import type { Metadata } from "next";
import Link from "next/link";
import { CloudOff, RefreshCw } from "lucide-react";

/** Shown by the service worker when the visitor is offline. */
export const metadata: Metadata = {
  title: "You're offline",
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-20 text-center">
      <span className="grid size-16 place-items-center rounded-full bg-surface-2 text-ink-soft">
        <CloudOff className="size-7" />
      </span>
      <h1 className="text-xl font-bold text-ink">You&apos;re offline</h1>
      <p className="text-sm text-ink-soft">
        Check your internet connection and try again. Your cart and account are safe.
      </p>
      <Link
        href="/"
        className="inline-flex h-11 items-center gap-2 rounded-xl bg-brand px-5 text-sm font-bold text-white transition hover:brightness-110"
      >
        <RefreshCw className="size-4" />
        Try again
      </Link>
    </div>
  );
}
