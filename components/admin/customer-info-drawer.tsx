"use client";

import { useEffect, useState } from "react";
import {
  CalendarDays,
  ExternalLink,
  Loader2,
  Mail,
  MapPin,
  Phone,
  ShoppingBag,
  UserRound,
  X,
} from "lucide-react";

import { adminApi } from "@/lib/messaging/client";
import type { AdminCustomerProfile } from "@/lib/messaging/types";

/**
 * Everything the customer wrote on their profile page, shown to the admin in a
 * side drawer: contact details, full delivery address, map location, birthday,
 * role and the orders they sent through the chat.
 */
export function CustomerInfoDrawer({
  conversationUid,
  customerName,
  onClose,
}: {
  conversationUid: string;
  customerName: string;
  onClose: () => void;
}) {
  const [data, setData] = useState<AdminCustomerProfile | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    adminApi
      .profile(conversationUid)
      .then((profile) => {
        if (!active) return;
        setData(profile);
        setState("ready");
      })
      .catch((cause: unknown) => {
        if (!active) return;
        setError(cause instanceof Error ? cause.message : "Couldn't load this customer.");
        setState("error");
      });
    return () => {
      active = false;
    };
  }, [conversationUid]);

  const profile = data?.profile;
  const fullAddress = profile
    ? [
      profile.buildingStreet,
      profile.locality,
      profile.area,
      profile.city,
      profile.region,
      profile.address,
    ]
      .filter((part) => part && part.trim())
      .join(", ")
    : "";

  return (
    <div className="fixed inset-0 z-[75] flex justify-end bg-black/40" onClick={onClose}>
      <aside
        role="dialog"
        aria-label={`Customer information for ${customerName}`}
        onClick={(event) => event.stopPropagation()}
        className="flex h-full w-full max-w-sm flex-col overflow-y-auto bg-white shadow-2xl"
      >
        <header className="sticky top-0 flex items-center gap-2 border-b border-border bg-white px-4 py-3">
          <h2 className="text-sm font-extrabold text-ink">Customer info</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="ml-auto grid size-8 place-items-center rounded-full text-ink-soft hover:bg-surface-2"
          >
            <X className="size-4" />
          </button>
        </header>

        {state === "loading" ? (
          <div className="flex flex-1 items-center justify-center py-16">
            <Loader2 className="size-5 animate-spin text-brand" />
          </div>
        ) : state === "error" || !profile ? (
          <p className="p-4 text-xs text-destructive">{error ?? "No profile found."}</p>
        ) : (
          <div className="flex flex-col gap-4 p-4">
            {/* Identity */}
            <div className="flex items-center gap-3">
              {profile.photoURL ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.photoURL} alt="" className="size-14 rounded-full object-cover" />
              ) : (
                <span className="grid size-14 place-items-center rounded-full bg-brand/10 text-lg font-extrabold text-brand">
                  {(profile.fullName || customerName).slice(0, 1).toUpperCase()}
                </span>
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-extrabold text-ink">{profile.fullName}</p>
                <p className="truncate text-[11px] text-ink-soft">{profile.email ?? "No email"}</p>
                <span className="mt-1 inline-flex rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-bold text-ink-soft uppercase">
                  {profile.role}
                </span>
              </div>
            </div>

            <Section title="Contact">
              <Row icon={Phone} label="Phone" value={profile.phoneNumber || "Not provided"} />
              <Row icon={Mail} label="Email" value={profile.email ?? "Not provided"} />
              <Row
                icon={CalendarDays}
                label="Birthday"
                value={profile.birthday || "Not provided"}
              />
              <Row icon={UserRound} label="Gender" value={profile.gender || "Not provided"} />
            </Section>

            <Section title={`Delivery address${profile.label ? ` · ${profile.label}` : ""}`}>
              <p className="flex items-start gap-2 text-xs leading-5 text-ink">
                <MapPin className="mt-0.5 size-3.5 shrink-0 text-brand" />
                {fullAddress || "No address saved yet"}
              </p>
              {profile.coordinates ? (
                <a
                  href={`https://www.google.com/maps?q=${profile.coordinates.latitude},${profile.coordinates.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-brand hover:underline"
                >
                  Open pinned location
                  <ExternalLink className="size-3" />
                </a>
              ) : null}
            </Section>

            <Section title="Orders sent in chat">
              {data.orders.length === 0 ? (
                <p className="text-xs text-ink-soft">No order messages yet.</p>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {data.orders.map((order) => (
                    <li
                      key={order.id}
                      className="flex items-center gap-2 rounded-lg border border-border px-2.5 py-1.5"
                    >
                      <ShoppingBag className="size-3.5 shrink-0 text-brand" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-mono text-[11px] font-bold text-ink">
                          {order.reference}
                        </p>
                        <p className="text-[10px] text-ink-soft">
                          {order.itemCount} item{order.itemCount === 1 ? "" : "s"} ·{" "}
                          {order.total.toFixed(2)} {order.currency}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <Section title="Account">
              <Row icon={UserRound} label="Customer ID" value={profile.createdAt ? data.uid : data.uid} mono />
              <Row
                icon={CalendarDays}
                label="Joined"
                value={profile.createdAt ? new Date(profile.createdAt).toLocaleDateString() : "Unknown"}
              />
              <Row
                icon={Mail}
                label="Messages"
                value={`${data.conversation.messageCount} · ${data.conversation.unreadForAdmin} unread`}
              />
            </Section>
          </div>
        )}
      </aside>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border p-3">
      <h3 className="mb-2 text-[10px] font-extrabold tracking-wider text-ink-soft uppercase">
        {title}
      </h3>
      <div className="flex flex-col gap-1.5">{children}</div>
    </section>
  );
}

function Row({
  icon: Icon,
  label,
  value,
  mono,
}: {
  icon: typeof Phone;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 size-3.5 shrink-0 text-brand" />
      <div className="min-w-0">
        <p className="text-[9px] font-bold tracking-wide text-ink-soft uppercase">{label}</p>
        <p className={mono ? "text-[10px] break-all text-ink" : "text-xs break-words text-ink"}>
          {value}
        </p>
      </div>
    </div>
  );
}
