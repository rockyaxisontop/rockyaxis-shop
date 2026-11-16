import { Flame, Gift, Timer } from "lucide-react";

import { convertFromUsd, formatLocal } from "@/lib/currency";
import { cn } from "@/lib/utils";

/** Milliseconds left before a campaign closes (0 when it already has). */
export function remainingMs(expiresAt: string) {
  return Math.max(0, new Date(expiresAt).getTime() - Date.now());
}

/** "2d 4h" style countdown — short enough to sit inside a chip. */
export function formatCountdown(expiresAt: string) {
  const ms = remainingMs(expiresAt);
  if (ms <= 0) return "Ended";
  const days = Math.floor(ms / 86_400_000);
  const hours = Math.floor((ms % 86_400_000) / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h ${minutes}m left`;
  return `${Math.max(1, minutes)}m left`;
}

/** Format an amount already in `currency` (whole numbers, no decimals). */
export function formatMoney(amount: number, currency: string) {
  return formatLocal(amount, currency);
}

/**
 * Campaign amounts are stored in USD. Convert to the visitor's currency and
 * format in one step, so the number shown matches every other price on the site.
 */
export function formatCampaignMoney(amountUsd: number, currency: string) {
  return formatLocal(convertFromUsd(amountUsd, currency), currency);
}

/** How much cash the owner is saving — the greedy hook. */
export function formatSavings(amount: number, currency: string) {
  return formatMoney(amount, currency);
}

/**
 * The price shown on every campaign screen: FREE, costing 0.
 *
 * Campaigns deliberately never show a running price, a strike-through list price
 * or a discount badge — the only figure that matters is what you pay.
 */
export function FreebiePrice({
  size = "md",
  className,
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-baseline gap-1.5", className)}>
      <span
        className={cn(
          "leading-none font-black tracking-tight text-stock",
          size === "lg" ? "text-2xl" : size === "sm" ? "text-xs" : "text-sm",
        )}
      >
        FREE
      </span>
      <span
        className={cn(
          "rounded-md bg-stock-bg px-1.5 py-0.5 font-extrabold text-stock",
          size === "lg" ? "text-base" : size === "sm" ? "text-[10px]" : "text-[11px]",
        )}
      >
        0
      </span>
    </span>
  );
}

export function campaignPercent(referralCount: number, target: number) {
  return Math.min(100, Math.round((referralCount / Math.max(1, target)) * 100));
}

export function spotsLeft(referralCount: number, target: number) {
  return Math.max(0, target - referralCount);
}

/** Capitalize short helper for status → label. */
const STATUS_LABEL = {
  active: "Live now",
  completed: "Unlocked",
  expired: "Ended",
  cancelled: "Ended",
} as const;

export type StatusTone = keyof typeof STATUS_LABEL;

type StatusPillProps = {
  status: StatusTone;
  className?: string;
};

/** Small live/unlocked/ended pill used everywhere in the freebie flow. */
export function FreebieStatusPill({ status, className }: StatusPillProps) {
  const isLive = status === "active";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold tracking-wide uppercase",
        isLive
          ? "bg-[#ee385e] text-white shadow-[0_2px_8px_rgba(238,56,94,0.35)]"
          : status === "completed"
            ? "bg-stock text-white"
            : "bg-ink/10 text-ink-soft",
        className,
      )}
    >
      {isLive ? (
        <span className="relative flex size-1.5">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-white/70" />
          <span className="relative inline-flex size-1.5 rounded-full bg-white" />
        </span>
      ) : status === "completed" ? (
        <Gift className="size-3" aria-hidden />
      ) : null}
      {STATUS_LABEL[status]}
    </span>
  );
}

/** Countdown chip with an urgency tone that hardens as time runs out. */
export function FreebieCountdown({
  expiresAt,
  status,
  className,
}: {
  expiresAt: string;
  status: StatusTone;
  className?: string;
}) {
  if (status !== "active") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-bold text-white",
          className,
        )}
      >
        <Timer className="size-3" aria-hidden />
        {STATUS_LABEL[status]}
      </span>
    );
  }

  const ms = remainingMs(expiresAt);
  const urgent = ms < 2 * 86_400_000;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold",
        urgent ? "bg-[#ffdd48] text-[#7a4a00]" : "bg-white/15 text-white",
        className,
      )}
    >
      <Timer className="size-3" aria-hidden />
      {formatCountdown(expiresAt)}
    </span>
  );
}

/** Segmented progress with visible tick marks — progress you can count. */
export function FreebieSegments({
  count,
  target,
  done,
  className,
}: {
  count: number;
  target: number;
  done?: boolean;
  className?: string;
}) {
  // Keep tick count readable on small screens.
  const segments = Math.min(target, 15);
  return (
    <div
      className={cn("flex gap-1", className)}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={target}
      aria-valuenow={Math.min(count, target)}
      aria-label={`${count} of ${target} referrals`}
    >
      {Array.from({ length: segments }).map((_, i) => {
        // Each tick covers ceil(target/segments) referrals so 15/15 fills fully.
        const perTick = Math.ceil(target / segments);
        const filled = i * perTick < count;
        return (
          <span
            key={i}
            className={cn(
              "h-2 flex-1 rounded-full transition-colors",
              filled ? (done ? "bg-stock" : "bg-[#ee385e]") : "bg-black/10",
            )}
          />
        );
      })}
    </div>
  );
}

/** Social proof strip — the reason people keep coming back to a live campaign. */
export function FreebieSocialProof({
  count,
  target,
  className,
}: {
  count: number;
  target: number;
  className?: string;
}) {
  const left = spotsLeft(count, target);
  return (
    <p className={cn("flex items-center gap-1.5 text-[11px] font-semibold text-ink-soft", className)}>
      <Flame className="size-3.5 text-[#f36d25]" aria-hidden />
      {count > 0
        ? `${count} ${count === 1 ? "person" : "people"} already helped · ${left} spots left`
        : `${target} spots — be first to help`}
    </p>
  );
}
