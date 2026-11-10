"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { sendEmailVerification } from "firebase/auth";
import { Check, Gift, Loader2, Share2, Users } from "lucide-react";

import { useAuth } from "@/components/providers";
import { Button } from "@/components/ui/button";
import { readJsonResponse } from "@/lib/client-api";

type Campaign = {
  id: string;
  productId: string;
  product: { title: string; image?: string | null; brand?: string | null };
  target: number;
  referralCount: number;
  status: string;
  expiresAt: string;
  isOwner: boolean;
};

export function FreebieCampaignView({ campaignId }: { campaignId: string }) {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [copied, setCopied] = useState(false);

  const loadCampaign = useCallback(async () => {
    const headers: HeadersInit = {};
    if (user) headers.Authorization = `Bearer ${await user.getIdToken()}`;
    const response = await fetch(`/api/freebies/campaigns/${encodeURIComponent(campaignId)}`, { headers });
    const body = await readJsonResponse<{ campaign?: Campaign; error?: string }>(response);
    if (!response.ok || !body.campaign) throw new Error(body.error ?? "Could not load this campaign.");
    setCampaign(body.campaign);
  }, [campaignId, user]);

  useEffect(() => {
    let active = true;
    void loadCampaign().catch((cause: unknown) => {
      if (active) setError(cause instanceof Error ? cause.message : "Could not load this campaign.");
    });
    return () => {
      active = false;
    };
  }, [loadCampaign]);

  async function shareCampaign() {
    setError("");
    setNotice("");
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Help me get this product for free", url });
      } else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setNotice("Referral link copied. Share it with 15 eligible people.");
        window.setTimeout(() => setCopied(false), 2000);
      }
    } catch (cause) {
      if (cause instanceof Error && cause.name === "AbortError") return;
      setError("Could not share the referral link. Copy the page URL to share it.");
    }
  }

  async function claimReferral() {
    if (!user) {
      router.push(`/login?next=${encodeURIComponent(`/freebie/${campaignId}`)}`);
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await user.reload();
      if (!user.emailVerified) {
        await sendEmailVerification(user);
        setNotice("Verify your email using the link we just sent, then return here to count your referral.");
        return;
      }
      const token = await user.getIdToken(true);
      const response = await fetch(`/api/freebies/campaigns/${encodeURIComponent(campaignId)}/claim`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await readJsonResponse<{ referralCount?: number; complete?: boolean; error?: string }>(response);
      if (!response.ok) throw new Error(body.error ?? "Your referral could not be verified.");
      setNotice(body.complete ? "Referral verified. The campaign is complete!" : "Referral verified successfully.");
      await loadCampaign();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Your referral could not be verified.");
    } finally {
      setBusy(false);
    }
  }

  if (loading || !campaign) {
    return (
      <div className="mx-auto flex min-h-72 w-full max-w-3xl flex-col gap-4 py-10">
        <div className="h-8 w-64 animate-pulse rounded bg-surface-2" />
        <div className="h-56 animate-pulse rounded-lg bg-surface-2" />
        {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
      </div>
    );
  }

  const progress = Math.min(100, Math.round((campaign.referralCount / campaign.target) * 100));
  const expired = campaign.status === "expired";
  const complete = campaign.status === "complete" || campaign.status === "ordered";
  const expires = new Date(campaign.expiresAt).toLocaleDateString();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 py-6 sm:py-10">
      <header>
        <p className="text-xs font-bold tracking-wider text-brand uppercase">Product referral campaign</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          {campaign.isOwner ? "Your freebie campaign" : "Help unlock this product"}
        </h1>
      </header>

      <section className="overflow-hidden rounded-xl border border-border bg-white">
        <div className="grid sm:grid-cols-[12rem_minmax(0,1fr)]">
          <div className="aspect-[4/3] bg-surface-2 sm:aspect-auto sm:min-h-48">
            {campaign.product.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={campaign.product.image} alt="" className="size-full object-contain" />
            ) : null}
          </div>
          <div className="flex min-w-0 flex-col justify-center p-5 sm:p-6">
            {campaign.product.brand ? <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">{campaign.product.brand}</p> : null}
            <h2 className="mt-1 text-lg font-bold text-ink">{campaign.product.title}</h2>
            <p className="mt-2 text-sm text-ink-soft">15 newly registered, email-verified people must accept your link before this product can be ordered for free.</p>
          </div>
        </div>

        <div className="border-t border-border p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-2 text-sm font-semibold text-ink">
              <Users className="size-4 text-brand" />
              {campaign.referralCount} of {campaign.target} verified referrals
            </span>
            <span className="text-xs text-ink-soft">Expires {expires}</span>
          </div>
          <div
            role="progressbar"
            aria-label="Verified referrals"
            aria-valuemin={0}
            aria-valuemax={campaign.target}
            aria-valuenow={campaign.referralCount}
            className="mt-3 h-2 overflow-hidden rounded-full bg-surface-2"
          >
            <div className="h-full rounded-full bg-brand transition-[width]" style={{ width: `${progress}%` }} />
          </div>

          {error ? <p role="alert" className="mt-4 text-sm text-destructive">{error}</p> : null}
          {notice ? <p role="status" className="mt-4 text-sm text-stock">{notice}</p> : null}

          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            {campaign.isOwner ? (
              <>
                <Button type="button" variant="outline" onClick={() => void shareCampaign()} disabled={expired || campaign.status === "ordered"} className="h-11 sm:w-auto">
                  {copied ? <Check className="size-4" /> : <Share2 className="size-4" />}
                  {copied ? "Link copied" : "Share referral link"}
                </Button>
                {complete && campaign.status !== "ordered" ? (
                  <Button asChild className="h-11 sm:w-auto">
                    <Link href={`/checkout?mode=free&campaignId=${encodeURIComponent(campaign.id)}`}>
                      <Gift className="size-4" />
                      Order Now Free
                    </Link>
                  </Button>
                ) : null}
                {campaign.status === "ordered" ? <p className="self-center text-sm font-semibold text-stock">Your free order has been placed.</p> : null}
              </>
            ) : (
              <Button type="button" onClick={() => void claimReferral()} disabled={busy || expired || complete} className="h-11 sm:w-auto">
                {busy ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                {user ? "Count my referral" : "Sign in to count referral"}
              </Button>
            )}
            <Button asChild variant="ghost" className="h-11 sm:w-auto">
              <Link href="/">Continue shopping</Link>
            </Button>
          </div>
          <p className="mt-4 text-xs leading-5 text-ink-soft">
            Each verified account can count once across all campaigns. Self-referrals, existing accounts, expired campaigns, and out-of-stock products do not qualify.
          </p>
        </div>
      </section>
    </div>
  );
}