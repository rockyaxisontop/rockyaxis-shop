"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
  ExternalLink,
  Gift,
  Loader2,
  PartyPopper,
  Share2,
  ShoppingBag,
  Sparkles,
} from "lucide-react";

import { useAuth } from "@/components/providers";
import { FreebieOrderButton } from "@/components/freebie-order-button";
import { freebieApi } from "@/lib/freebies/client";
import { getCampaignShareMessage } from "@/lib/freebies/share";
import type { PublicCampaign } from "@/lib/freebies/types";
import {
  campaignPercent,
  FreebieCountdown,
  FreebieSegments,
  FreebieSocialProof,
  FreebieStatusPill,
  formatMoney,
  spotsLeft,
} from "@/components/freebie-ui";
import { cn } from "@/lib/utils";

/** The campaign owner's dashboard: progress, sharing actions, and store navigation. */
export function FreebieMine({ campaignId }: { campaignId: string }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [campaign, setCampaign] = useState<PublicCampaign | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [copied, setCopied] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [link, setLink] = useState("");
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!campaign?.code) return;
    setLink(`${window.location.origin}/freebie/${campaign.code}`);
  }, [campaign?.code]);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      setState("error");
      return;
    }

    let active = true;
    freebieApi
      .listCampaigns()
      .then(({ campaigns }) => {
        if (!active) return;
        const found = campaigns.find((item) => item.id === campaignId);
        if (found) {
          setCampaign(found);
          setState("ready");
        } else {
          setState("error");
        }
      })
      .catch(() => {
        if (active) setState("error");
      });

    return () => {
      active = false;
    };
  }, [loading, user, campaignId]);

  if (state === "loading") {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-3" aria-label="Loading campaign">
        <div className="h-36 animate-pulse rounded-2xl bg-surface-2" />
        <div className="h-28 animate-pulse rounded-2xl bg-surface-2" />
        <div className="h-14 animate-pulse rounded-2xl bg-surface-2" />
      </div>
    );
  }

  if (state === "error" || !campaign) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-16 text-center">
        <span className="grid size-14 place-items-center rounded-full bg-brand-tint text-brand">
          <Gift className="size-7" />
        </span>
        <h1 className="text-xl font-bold text-ink">Campaign not found</h1>
        <p className="text-sm text-ink-soft">Sign in with the account that started this campaign.</p>
        <div className="mt-1 flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
          <Link
            href="/freebie"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-border px-4 text-sm font-semibold text-ink transition hover:border-brand hover:text-brand"
          >
            <Gift className="size-4" />
            My freebies
          </Link>
          <Link
            href="/"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-white transition hover:brightness-110"
          >
            <ShoppingBag className="size-4" />
            Shop now
          </Link>
        </div>
      </div>
    );
  }

  const percent = campaignPercent(campaign.referralCount, campaign.target);
  const done = campaign.status === "completed";
  const expired = campaign.status === "expired" || campaign.status === "cancelled";
  const remaining = spotsLeft(campaign.referralCount, campaign.target);
  const price = formatMoney(campaign.product.price, campaign.product.currency);

  async function copy() {
    if (!link) return;
    setShareError(null);
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setShareError("Couldn’t copy the link. You can select and copy it below.");
    }
  }

  async function share() {
    if (!campaign || !link) return;
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
        setShareError("Couldn’t open the share menu. Copy the invite link instead.");
      }
    }
  }

  async function restartCampaign() {
    if (!campaign) return;
    setStarting(true);
    setShareError(null);
    try {
      const { campaign: restarted } = await freebieApi.startCampaign(campaign.product.productId);
      router.push(`/freebie/mine/${restarted.id}`);
    } catch (error) {
      setShareError(error instanceof Error ? error.message : "Couldn’t start a new campaign.");
      setStarting(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 sm:gap-4">
      <div className="flex items-center justify-between gap-2">
        <Link
          href="/freebie"
          className="inline-flex h-9 items-center gap-1.5 rounded-lg px-1.5 text-sm font-semibold text-ink-soft transition hover:text-brand"
        >
          <ArrowLeft className="size-4" />
          My freebies
        </Link>
        <Link
          href="/cart"
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-white px-3 text-xs font-semibold text-ink transition hover:border-brand hover:text-brand"
        >
          <ShoppingBag className="size-3.5" />
          Cart
        </Link>
      </div>

      {/* Hero: one clear sentence + the three numbers that matter. */}
      <section
        className={cn(
          "relative overflow-hidden rounded-2xl px-4 py-4 text-white sm:px-5",
          done
            ? "bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-600"
            : expired
              ? "bg-gradient-to-br from-slate-800 via-slate-700 to-slate-600"
              : "bg-gradient-to-br from-[#011627] via-[#0b3d59] to-[#1d7fa4]",
        )}
      >
        <span className="pointer-events-none absolute -top-10 -right-10 size-36 rounded-full bg-white/10" />
        <span className="pointer-events-none absolute -bottom-16 -left-10 size-40 rounded-full border-[18px] border-white/10" />

        <div className="relative z-10 flex items-center justify-between gap-2">
          <FreebieStatusPill status={campaign.status} />
          <FreebieCountdown expiresAt={campaign.expiresAt} status={campaign.status} />
        </div>

        <h1 className="relative z-10 mt-2 text-xl leading-[1.15] font-extrabold tracking-tight text-balance sm:text-3xl">
          {done
            ? "🎉 Unlocked — your free order is ready"
            : expired
              ? "This campaign has ended"
              : `${remaining} ${remaining === 1 ? "friend" : "friends"} away from FREE`}
        </h1>
        <p className="relative z-10 mt-1 text-xs leading-5 text-white/85 sm:text-sm">
          {done
            ? "Place your ₨0 order below and it ships to you."
            : expired
              ? "Start again for a fresh 7-day window and a new link."
              : `Worth ${price}. Every verified friend who taps your link brings you closer — no purchase needed.`}
        </p>

        <div className="relative z-10 mt-3 rounded-xl bg-white/10 px-3 py-2.5 backdrop-blur">
          <div className="flex items-end justify-between gap-2">
            <p className="text-2xl leading-none font-extrabold">
              {campaign.referralCount}
              <span className="text-sm font-semibold text-white/70"> / {campaign.target}</span>
            </p>
            <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-extrabold">
              {done ? "Complete" : `${percent}% there`}
            </span>
          </div>
          <FreebieSegments count={campaign.referralCount} target={campaign.target} done={done} className="mt-2" />
        </div>
      </section>

      {/* Product strip */}
      <section className="flex items-center gap-3 rounded-2xl border border-border bg-white p-3 shadow-sm">
        <div className="size-14 shrink-0 overflow-hidden rounded-xl bg-surface-2">
          {campaign.product.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={campaign.product.image} alt={campaign.product.title} className="size-full object-cover" />
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          {campaign.product.brand ? (
            <p className="truncate text-[10px] font-bold tracking-wider text-brand uppercase">
              {campaign.product.brand}
            </p>
          ) : null}
          <p className="line-clamp-1 text-sm font-bold text-ink">{campaign.product.title}</p>
          <p className="mt-0.5 flex items-baseline gap-1.5">
            <span className="text-[11px] text-ink-soft line-through">{price}</span>
            <span className="text-sm font-extrabold text-stock">₨0</span>
          </p>
        </div>
        <Link
          href={`/products/${campaign.product.productId}`}
          aria-label="View product details"
          className="grid size-9 shrink-0 place-items-center rounded-lg border border-border text-ink-soft transition hover:border-brand hover:text-brand"
        >
          <ExternalLink className="size-4" />
        </Link>
      </section>

      {/* Share panel */}
      <section className="rounded-2xl border border-border bg-white p-3 shadow-sm sm:p-4">
        <div className="flex items-start gap-2.5">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-tint text-brand">
            <Share2 className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-extrabold text-ink">
              {done ? "Your reward is ready" : expired ? "Ready for another try?" : "Send this link to your people"}
            </h2>
            <p className="mt-0.5 text-[11px] leading-4 text-ink-soft">
              {done
                ? "Place your free order whenever you’re ready."
                : expired
                  ? "Restart for a new link and another chance."
                  : "They sign in, verify email, done. One tap each — no purchase."}
            </p>
          </div>
        </div>

        {done ? (
          <div className="mt-3">
            <FreebieOrderButton campaign={campaign} />
          </div>
        ) : expired ? (
          <button
            type="button"
            onClick={restartCampaign}
            disabled={starting}
            className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-60"
          >
            {starting ? <Loader2 className="size-4 animate-spin" /> : <Gift className="size-4" />}
            Start a new campaign
          </button>
        ) : (
          <>
            <div
              className="mt-2.5 flex items-center gap-2 rounded-xl border border-border bg-surface-2 px-3 py-2"
              title={link}
            >
              <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-ink-soft">
                {link || "Preparing your link…"}
              </span>
              <button
                type="button"
                onClick={copy}
                disabled={!link}
                aria-label={copied ? "Link copied" : "Copy link"}
                className="grid size-7 shrink-0 place-items-center rounded-md bg-white text-ink transition hover:text-brand disabled:opacity-50"
              >
                {copied ? <Check className="size-3.5 text-stock" /> : <Copy className="size-3.5" />}
              </button>
            </div>
            <button
              type="button"
              onClick={share}
              disabled={!link}
              className="mt-2 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#f36d25] to-[#ee385e] text-sm font-extrabold text-white shadow-[0_8px_20px_rgba(238,56,94,0.3)] transition hover:brightness-110 active:scale-[0.99] disabled:opacity-50"
            >
              <Share2 className="size-4" />
              Share my invite
            </button>
          </>
        )}

        {shareError ? (
          <p role="alert" className="mt-2 text-xs text-destructive">
            {shareError}
          </p>
        ) : null}
      </section>

      {!done ? <FreebieSocialProof count={campaign.referralCount} target={campaign.target} className="px-1" /> : null}

      {done ? (
        <p className="flex items-center justify-center gap-1.5 text-xs font-semibold text-stock">
          <PartyPopper className="size-3.5" />
          Goal complete — {campaign.referralCount} friends helped.
        </p>
      ) : null}

      <Link
        href="/"
        className="mt-auto inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-ink-soft transition hover:text-brand"
      >
        <Sparkles className="size-3.5" />
        Browse more products
        <ArrowRight className="size-3.5" />
      </Link>

      {/* Sticky share bar on phones: sharing is never more than a thumb away. */}
      {!done && !expired ? (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-white/95 px-3 py-2.5 backdrop-blur sm:hidden">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={copy}
              disabled={!link}
              className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border border-border text-xs font-bold text-ink disabled:opacity-50"
            >
              {copied ? <Check className="size-4 text-stock" /> : <Copy className="size-4" />}
              {copied ? "Copied" : "Copy link"}
            </button>
            <button
              type="button"
              onClick={share}
              disabled={!link}
              className="inline-flex h-11 flex-[1.4] items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[#f36d25] to-[#ee385e] text-xs font-extrabold text-white disabled:opacity-50"
            >
              <Share2 className="size-4" />
              Share · {remaining} to go
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}


