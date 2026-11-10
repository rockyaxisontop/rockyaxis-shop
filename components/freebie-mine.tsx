"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Copy, Gift, Loader2, LockKeyhole, Share2, Users } from "lucide-react";

import { useAuth } from "@/components/providers";
import { FreebieOrderButton } from "@/components/freebie-order-button";
import { freebieApi } from "@/lib/freebies/client";
import { getCampaignShareMessage } from "@/lib/freebies/share";
import type { PublicCampaign } from "@/lib/freebies/types";
import { cn } from "@/lib/utils";

/** The campaign owner's own page: share link + live progress + order button. */
export function FreebieMine({ campaignId }: { campaignId: string }) {
  const { user, loading } = useAuth();
  const [campaign, setCampaign] = useState<PublicCampaign | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [copied, setCopied] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      setState("error");
      return;
    }
    freebieApi
      .listCampaigns()
      .then(({ campaigns }) => {
        const found = campaigns.find((c) => c.id === campaignId);
        if (found) {
          setCampaign(found);
          setState("ready");
        } else {
          setState("error");
        }
      })
      .catch(() => setState("error"));
  }, [loading, user, campaignId]);

  if (state === "loading") {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="size-6 animate-spin text-brand" />
      </div>
    );
  }

  if (state === "error" || !campaign) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-20 text-center">
        <h1 className="text-xl font-bold text-ink">Campaign not found</h1>
        <p className="text-sm text-ink-soft">Sign in with the account that started it.</p>
        <Link href="/cart" className="rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white">
          Back to cart
        </Link>
      </div>
    );
  }

  const link = `${window.location.origin}/freebie/${campaign.code}`;
  const percent = Math.min(100, Math.round((campaign.referralCount / campaign.target) * 100));
  const done = campaign.status === "completed";
  const remaining = Math.max(0, campaign.target - campaign.referralCount);
  const price = new Intl.NumberFormat("en", {
    style: "currency",
    currency: campaign.product.currency,
  }).format(campaign.product.price);

  async function copy() {
    if (!campaign) return;
    setShareError(null);
    try {
      await navigator.clipboard.writeText(`${getCampaignShareMessage(campaign)}\n${link}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setShareError("Couldn't copy the invite. Please copy the campaign link below.");
    }
  }

  async function share() {
    if (!campaign) return;
    setShareError(null);
    if (!navigator.share) {
      await copy();
      return;
    }
    try {
      await navigator.share({
        title: `Help unlock ${campaign.product.title}`,
        text: getCampaignShareMessage(campaign),
        url: link,
      });
    } catch (error) {
      if (error instanceof Error && error.name !== "AbortError") {
        setShareError("Couldn't open the share menu. Copy the invite instead.");
      }
    }
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4 py-6">
      <div className="rounded-2xl border border-border bg-white p-5 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-tint px-3 py-1 text-[11px] font-bold text-brand">
          <Gift className="size-3.5" />
          Your campaign
        </span>
        <h1 className="mt-3 text-xl font-extrabold tracking-tight text-ink">
          {done ? "You unlocked it!" : "Share to unlock it free"}
        </h1>

        <div className="mt-4 flex items-center gap-3 rounded-xl border border-border p-3 text-left">
          <div className="size-16 shrink-0 overflow-hidden rounded-lg bg-surface-2">
            {campaign.product.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={campaign.product.image} alt="" className="size-full object-cover" />
            ) : null}
          </div>
          <div className="min-w-0">
            <p className="line-clamp-2 text-sm font-semibold text-ink">{campaign.product.title}</p>
            <p className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xs text-ink-soft line-through">{price}</span>
              <span className="text-sm font-extrabold text-stock">FREE when unlocked</span>
            </p>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="flex items-center gap-1.5 text-ink">
              <Users className="size-3.5 text-brand" />
              {campaign.referralCount}/{campaign.target}
            </span>
            <span className={done ? "text-stock" : "text-ink-soft"}>
              {done ? "Complete" : `${remaining} to go`}
            </span>
          </div>
          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-surface-2">
            <div
              className={cn("h-full rounded-full transition-all", done ? "bg-stock" : "bg-brand")}
              style={{ width: `${Math.max(percent, 3)}%` }}
            />
          </div>
        </div>

        <div className="mt-5">
          {done ? (
            <FreebieOrderButton campaign={campaign} />
          ) : (
            <button
              type="button"
              disabled
              aria-disabled="true"
              className="inline-flex h-11 w-full cursor-not-allowed items-center justify-center gap-1.5 rounded-lg bg-surface-2 text-sm font-bold text-ink-soft"
            >
              <LockKeyhole className="size-4" />
              Order Now — unlock at {campaign.target} referrals
            </button>
          )}
        </div>

        {!done ? (
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={copy}
              className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-lg border border-border text-sm font-semibold text-ink hover:border-brand hover:text-brand"
            >
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              {copied ? "Copied" : "Copy link"}
            </button>
            <button
              type="button"
              onClick={share}
              className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand text-sm font-bold text-white hover:brightness-110"
            >
              <Share2 className="size-4" />
              Share
            </button>
          </div>
        ) : null}

        {shareError ? <p role="alert" className="mt-2 text-left text-xs text-destructive">{shareError}</p> : null}
        <p className="mt-3 text-xs text-ink-soft">
          {done
            ? "Your free order is ready to place. Buying directly remains a separate option on the retailer's site."
            : `Invite ${campaign.target} unique, email-verified people within 7 days to unlock the free order. Helping does not require a purchase.`}
        </p>

        <p className="mt-3 truncate rounded-lg bg-surface-2 px-3 py-2 text-[11px] text-ink-soft">
          {link}
        </p>
      </div>
    </div>
  );
}
