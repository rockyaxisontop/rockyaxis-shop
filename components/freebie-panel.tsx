"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Copy, Gift, Loader2, Share2, Sparkles } from "lucide-react";

import { freebieApi } from "@/lib/freebies/client";
import type { PublicCampaign } from "@/lib/freebies/types";
import { cn } from "@/lib/utils";

/**
 * "Get it for FREE" control shown on each cart row.
 * Progress is server-authoritative: the browser only ever reads it.
 */
export function FreebiePanel({
  productId,
  campaign,
  onCampaign,
}: {
  productId: string;
  campaign: PublicCampaign | undefined;
  onCampaign: (campaign: PublicCampaign) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const start = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const { campaign: created } = await freebieApi.startCampaign(productId);
      onCampaign(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't start the campaign.");
    } finally {
      setBusy(false);
    }
  }, [productId, onCampaign]);

  if (!campaign) {
    return (
      <div className="mt-2">
        <button
          type="button"
          onClick={start}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-brand/50 bg-brand-tint px-2.5 py-1.5 text-[11px] font-bold text-brand transition hover:border-brand hover:bg-brand/10 disabled:opacity-60"
        >
          {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Gift className="size-3.5" />}
          Get it for FREE
        </button>
        {error ? <p className="mt-1 text-[11px] text-destructive">{error}</p> : null}
      </div>
    );
  }

  const percent = Math.min(100, Math.round((campaign.referralCount / campaign.target) * 100));
  const done = campaign.status === "completed";
  const expired = campaign.status === "expired";
  const link =
    typeof window !== "undefined" ? `${window.location.origin}/freebie/${campaign.code}` : "";

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Couldn't copy — select the link manually.");
    }
  }

  async function share() {
    if (navigator.share) {
      await navigator.share({ title: "Help me get this free!", url: link }).catch(() => { });
    } else {
      void copy();
    }
  }

  return (
    <div
      className={cn(
        "mt-2 rounded-lg border p-2.5",
        done ? "border-stock/40 bg-stock-bg" : expired ? "border-border bg-surface-2" : "border-brand/30 bg-brand-tint",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[11px] font-bold text-ink">
          {done ? <Sparkles className="size-3.5 text-stock" /> : <Gift className="size-3.5 text-brand" />}
          {done ? "Unlocked — it's free!" : expired ? "Campaign expired" : "Freebie campaign"}
        </span>
        <span className="text-[11px] font-semibold text-ink-soft">
          {campaign.referralCount}/{campaign.target}
        </span>
      </div>

      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white">
        <div
          className={cn("h-full rounded-full transition-all", done ? "bg-stock" : "bg-brand")}
          style={{ width: `${percent}%` }}
        />
      </div>

      {!done && !expired ? (
        <>
          <p className="mt-1.5 text-[11px] text-ink-soft">
            Share your link — {campaign.target - campaign.referralCount} more to go.
          </p>
          <div className="mt-2 flex gap-1.5">
            <button
              type="button"
              onClick={copy}
              className="inline-flex flex-1 items-center justify-center gap-1 rounded-md border border-border bg-white px-2 py-1.5 text-[11px] font-semibold text-ink hover:border-brand hover:text-brand"
            >
              {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
              {copied ? "Copied" : "Copy link"}
            </button>
            <button
              type="button"
              onClick={share}
              className="inline-flex flex-1 items-center justify-center gap-1 rounded-md bg-brand px-2 py-1.5 text-[11px] font-semibold text-white hover:brightness-110"
            >
              <Share2 className="size-3" />
              Share
            </button>
          </div>
        </>
      ) : null}

      {error ? <p className="mt-1 text-[11px] text-destructive">{error}</p> : null}
    </div>
  );
}

/** Loads the user's campaigns once and keeps them in sync after actions. */
export function useFreebieCampaigns(enabled: boolean) {
  const [campaigns, setCampaigns] = useState<Record<string, PublicCampaign>>({});
  const [loading, setLoading] = useState(enabled);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    freebieApi
      .listCampaigns()
      .then(({ campaigns: list }) => {
        if (!active) return;
        setCampaigns(Object.fromEntries(list.map((c) => [c.product.productId, c])));
      })
      .catch(() => { })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [enabled]);

  const upsert = useCallback((campaign: PublicCampaign) => {
    setCampaigns((prev) => ({ ...prev, [campaign.product.productId]: campaign }));
  }, []);

  return { campaigns, loading, upsert };
}
