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
  Home,
  Loader2,
  LockKeyhole,
  PartyPopper,
  Share2,
  ShoppingBag,
  Sparkles,
  Users,
} from "lucide-react";

import { useAuth } from "@/components/providers";
import { FreebieOrderButton } from "@/components/freebie-order-button";
import { freebieApi } from "@/lib/freebies/client";
import { getCampaignShareMessage } from "@/lib/freebies/share";
import type { PublicCampaign } from "@/lib/freebies/types";
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
    setLink(`${window.location.origin}/freebie/${campaign?.code ?? ""}`);
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
      <div className="flex justify-center py-24" aria-label="Loading campaign">
        <Loader2 className="size-6 animate-spin text-brand" />
      </div>
    );
  }

  if (state === "error" || !campaign) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-20 text-center">
        <span className="grid size-14 place-items-center rounded-full bg-brand-tint text-brand">
          <Gift className="size-7" />
        </span>
        <h1 className="text-xl font-bold text-ink">Campaign not found</h1>
        <p className="text-sm text-ink-soft">Sign in with the account that started this campaign.</p>
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
          <Link
            href="/cart"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-border px-4 text-sm font-semibold text-ink transition hover:border-brand hover:bg-brand-tint"
          >
            <ShoppingBag className="size-4" />
            View cart
          </Link>
          <Link
            href="/"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-brand px-4 text-sm font-semibold text-white transition hover:brightness-110"
          >
            <Home className="size-4" />
            Shop now
          </Link>
        </div>
      </div>
    );
  }

  const percent = Math.min(100, Math.round((campaign.referralCount / campaign.target) * 100));
  const done = campaign.status === "completed";
  const expired = campaign.status === "expired" || campaign.status === "cancelled";
  const remaining = Math.max(0, campaign.target - campaign.referralCount);
  const price = new Intl.NumberFormat("en", {
    style: "currency",
    currency: campaign.product.currency,
  }).format(campaign.product.price);

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

  const statusLabel = done
    ? "Goal complete"
    : expired
      ? "Campaign ended"
      : "Campaign in progress";

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-5 py-4 sm:gap-6 sm:py-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/freebie"
          className="inline-flex h-9 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-ink-soft transition hover:bg-white hover:text-brand"
        >
          <ArrowLeft className="size-4" />
          All freebie campaigns
        </Link>
        <div className="flex gap-2">
          <Link
            href="/cart"
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-white px-3 text-xs font-semibold text-ink transition hover:border-brand hover:text-brand sm:text-sm"
          >
            <ShoppingBag className="size-4" />
            View cart
          </Link>
          <Link
            href="/search"
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-white px-3 text-xs font-semibold text-ink transition hover:border-brand hover:text-brand sm:text-sm"
          >
            <Home className="size-4" />
            Shop now
          </Link>
        </div>
      </div>

      <section
        className={cn(
          "relative overflow-hidden rounded-3xl px-5 py-6 text-white shadow-sm sm:px-8 sm:py-9",
          done
            ? "bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-600"
            : expired
              ? "bg-gradient-to-br from-slate-800 via-slate-700 to-slate-600"
              : "bg-gradient-to-br from-[#011627] via-[#0b3d59] to-[#1d7fa4]",
        )}
      >
        <div className="relative z-10 max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold tracking-wide text-white/95 backdrop-blur">
            {done ? <PartyPopper className="size-3.5" /> : <Gift className="size-3.5" />}
            {statusLabel}
          </span>
          <h1 className="mt-4 text-2xl leading-tight font-extrabold tracking-tight text-balance sm:text-4xl">
            {done
              ? "You did it — your freebie is unlocked!"
              : expired
                ? "This campaign has ended"
                : "Share with friends. Get it for free."}
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-white/80 sm:text-base">
            {done
              ? "Your referral goal is complete. Place your free order below, then keep exploring the store."
              : expired
                ? "Start a new campaign to get another 7-day window and a fresh referral link."
                : `You’re ${percent}% of the way there. Invite ${remaining} more unique, email-verified ${remaining === 1 ? "person" : "people"} to unlock your free order.`}
          </p>
        </div>
        <span className="pointer-events-none absolute -right-14 -bottom-28 size-72 rounded-full border-[34px] border-white/10 sm:size-96" />
        <span className="pointer-events-none absolute top-4 right-10 size-28 rounded-full bg-white/5 blur-2xl sm:size-40" />
      </section>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)]">
        <section className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
          <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5">
            <div className="aspect-square w-full shrink-0 overflow-hidden rounded-xl bg-surface-2 sm:size-28">
              {campaign.product.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={campaign.product.image}
                  alt={campaign.product.title}
                  className="size-full object-cover"
                />
              ) : null}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold tracking-widest text-brand uppercase">
                {campaign.product.brand || "Featured product"}
              </p>
              <h2 className="mt-1 text-base leading-snug font-bold text-ink sm:text-lg">
                {campaign.product.title}
              </h2>
              <div className="mt-2 flex flex-wrap items-baseline gap-2">
                <span className="text-xs text-ink-soft line-through">{price}</span>
                <span className="text-base font-extrabold text-stock">FREE when unlocked</span>
              </div>
              <Link
                href={`/products/${campaign.product.productId}`}
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-brand hover:underline"
              >
                View product details
                <ExternalLink className="size-3.5" />
              </Link>
            </div>
          </div>

          <div className="border-t border-border bg-surface-2/70 p-4 sm:p-5">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-ink-soft">Referral progress</p>
                <p className="mt-0.5 text-2xl font-extrabold tracking-tight text-ink">
                  {campaign.referralCount}
                  <span className="text-base font-semibold text-ink-soft"> / {campaign.target}</span>
                </p>
              </div>
              <span
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-bold",
                  done ? "bg-stock-bg text-stock" : expired ? "bg-white text-ink-soft" : "bg-brand-tint text-brand",
                )}
              >
                {done ? "Unlocked" : expired ? "Expired" : `${remaining} to go`}
              </span>
            </div>
            <div
              className="mt-3 h-3 overflow-hidden rounded-full bg-white shadow-inner"
              role="progressbar"
              aria-label="Campaign referral progress"
              aria-valuenow={campaign.referralCount}
              aria-valuemin={0}
              aria-valuemax={campaign.target}
            >
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-700",
                  done ? "bg-stock" : "bg-gradient-to-r from-brand to-[#2da9d6]",
                )}
                style={{ width: `${percent}%` }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-ink-soft">
              <span>Campaign started</span>
              <span>{campaign.target} verified referrals unlocks your order</span>
            </div>
          </div>
        </section>

        <aside className="flex flex-col gap-4">
          <section className="rounded-2xl border border-border bg-white p-4 shadow-sm sm:p-5">
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-tint text-brand">
                <Share2 className="size-5" />
              </span>
              <div>
                <h2 className="font-bold text-ink">
                  {done ? "Your reward is ready" : expired ? "Ready for another try?" : "Invite your people"}
                </h2>
                <p className="mt-1 text-xs leading-5 text-ink-soft">
                  {done
                    ? "The goal is complete. Place your free order whenever you’re ready."
                    : expired
                      ? "Restart the campaign to get a new link and another chance to unlock this product."
                      : "Share your personal link. Friends sign in and verify their email to count—no purchase needed."}
                </p>
              </div>
            </div>

            {done ? (
              <div className="mt-4">
                <FreebieOrderButton campaign={campaign} />
              </div>
            ) : expired ? (
              <button
                type="button"
                onClick={restartCampaign}
                disabled={starting}
                className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-60"
              >
                {starting ? <Loader2 className="size-4 animate-spin" /> : <Gift className="size-4" />}
                Start a new campaign
              </button>
            ) : (
              <>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={copy}
                    disabled={!link}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-border bg-white px-3 text-sm font-semibold text-ink transition hover:border-brand hover:bg-brand-tint hover:text-brand disabled:opacity-50"
                  >
                    {copied ? <Check className="size-4 text-stock" /> : <Copy className="size-4" />}
                    {copied ? "Copied" : "Copy link"}
                  </button>
                  <button
                    type="button"
                    onClick={share}
                    disabled={!link}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand px-3 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-50"
                  >
                    <Share2 className="size-4" />
                    Share invite
                  </button>
                </div>
                <p className="mt-3 rounded-lg bg-surface-2 px-3 py-2 text-[11px] leading-5 text-ink-soft">
                  {link || "Preparing your campaign link…"}
                </p>
              </>
            )}

            {shareError ? (
              <p role="alert" className="mt-3 text-xs text-destructive">
                {shareError}
              </p>
            ) : null}
          </section>

          <section className="rounded-2xl border border-brand/15 bg-brand-tint/50 p-4 sm:p-5">
            <h2 className="flex items-center gap-2 text-sm font-bold text-ink">
              <Sparkles className="size-4 text-brand" />
              Good to know
            </h2>
            <ul className="mt-3 space-y-2.5 text-xs leading-5 text-ink-soft">
              <li className="flex gap-2">
                <Users className="mt-0.5 size-3.5 shrink-0 text-brand" />
                Each person can count once per campaign.
              </li>
              <li className="flex gap-2">
                <LockKeyhole className="mt-0.5 size-3.5 shrink-0 text-brand" />
                Your Order Now button unlocks when you reach the goal.
              </li>
              <li className="flex gap-2">
                <Gift className="mt-0.5 size-3.5 shrink-0 text-brand" />
                Invited friends don’t need to make a purchase to help.
              </li>
            </ul>
          </section>
        </aside>
      </div>

      <section className="rounded-2xl border border-border bg-white p-4 shadow-sm sm:flex sm:items-center sm:justify-between sm:gap-6 sm:p-5">
        <div>
          <h2 className="font-bold text-ink">Keep exploring MT Store</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Browse more products or return to your saved cart at any time.
          </p>
        </div>
        <div className="mt-4 flex flex-col gap-2 sm:mt-0 sm:flex-row">
          <Link
            href="/cart"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-border px-4 text-sm font-semibold text-ink transition hover:border-brand hover:bg-brand-tint hover:text-brand"
          >
            <ShoppingBag className="size-4" />
            View cart
          </Link>
          <Link
            href="/"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-brand px-4 text-sm font-semibold text-white transition hover:brightness-110"
          >
            Shop now
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
