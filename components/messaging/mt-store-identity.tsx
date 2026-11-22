"use client";

import { BadgeCheck, Facebook, Instagram, Mail, Music2, Youtube } from "lucide-react";

import { SITE_CONTACT, SITE_SOCIAL_LINKS } from "@/lib/site";
import { cn } from "@/lib/utils";

const ICONS = {
  instagram: Instagram,
  facebook: Facebook,
  tiktok: Music2,
  youtube: Youtube,
} as const;

/**
 * Who you are talking to: the official badge, the support email and the real
 * social accounts. Shown when a customer taps the MT Store avatar anywhere.
 */
export function MtStoreIdentity({ compact = false }: { compact?: boolean }) {
  return (
    <div className={cn("flex flex-col", compact ? "mt-2 gap-1" : "gap-2")}>
      <p className="flex items-center gap-1 text-[11px] font-bold text-ink">
        <BadgeCheck className="size-3.5 text-brand" aria-hidden />
        Official MT Store account
      </p>

      <a
        href={`mailto:${SITE_CONTACT.email}`}
        className="flex items-center gap-2 rounded-lg px-1.5 py-1 text-[11px] font-semibold text-ink transition hover:bg-surface-2"
      >
        <Mail className="size-3.5 shrink-0 text-brand" />
        <span className="truncate">{SITE_CONTACT.email}</span>
      </a>

      <ul className="grid grid-cols-2 gap-2">
        {SITE_SOCIAL_LINKS.map(({ label, href, icon }) => {
          const Icon = ICONS[icon];
          return (
            <li key={label}>
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg px-1.5 py-1 text-[11px] font-semibold text-ink transition hover:bg-brand-tint hover:text-brand"
              >
                <Icon className="size-3.5 text-brand" aria-hidden />
                {label}
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
