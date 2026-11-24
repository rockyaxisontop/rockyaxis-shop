"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Bell,
  CheckCheck,
  Inbox,
  Loader2,
  MailOpen,
  MessageSquare,
  RefreshCw,
  Search,
  ShieldAlert,
  Signal,
  Users,
} from "lucide-react";

import { useAuth } from "@/components/providers";
import {
  MT_STORE,
  MessageBubble,
  formatDay,
  useLiveMessages,
} from "@/components/messaging/chat-parts";
import { MessageComposer } from "@/components/messaging/composer";
import { adminApi } from "@/lib/messaging/client";
import { CustomerInfoDrawer } from "@/components/admin/customer-info-drawer";
import { QuickMessagePicker } from "@/components/admin/quick-message-picker";
import { buildContext } from "@/lib/messaging/quick-replies";
import { useCurrency } from "@/components/currency-provider";
import { EnablePushButton } from "@/components/messaging/enable-push-button";
import type {
  AdminCustomerProfile,
  AdminStats,
  ChatOrderStatus,
  PublicConversation,
  PublicMessage,
} from "@/lib/messaging/types";
import { cn } from "@/lib/utils";

type Filter = "all" | "unreplied" | "unread" | "replied" | "newest" | "active";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "unreplied", label: "Unreplied" },
  { key: "unread", label: "Unread" },
  { key: "replied", label: "Replied" },
  { key: "newest", label: "Newest" },
  { key: "active", label: "Active" },
];

const ACTIVE_WINDOW_MS = 15 * 60 * 1000;

function isOnline(iso: string | null) {
  return iso ? Date.now() - new Date(iso).getTime() < ACTIVE_WINDOW_MS : false;
}

function relative(iso: string | null) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return days < 7 ? `${days}d` : new Date(iso).toLocaleDateString([], { day: "numeric", month: "short" });
}

/**
 * Admin messaging dashboard at /adminhacker.
 *
 * The URL grants nothing: the panel only renders after /api/admin/me confirms a
 * verified token whose email is allow-listed AND has an `admins/{uid}` document.
 */
export function AdminDashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [access, setAccess] = useState<"checking" | "granted" | "denied" | "signed-out">("checking");
  const [conversations, setConversations] = useState<PublicConversation[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [soundOn, setSoundOn] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      setAccess("signed-out");
      router.replace(`/login?next=${encodeURIComponent("/adminhacker")}`);
      return;
    }
    adminApi
      .me()
      .then(() => setAccess("granted"))
      .catch(() => setAccess("denied"));
  }, [loading, router, user]);

  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const { conversations: list, stats: counters, nextCursor: cursor } =
        await adminApi.conversations();

      // Merge by id so a loaded page of older chats isn't thrown away when the
      // 5-second poll refreshes the first page.
      setConversations((current) => {
        const map = new Map(current.map((item) => [item.id, item]));
        for (const item of list) map.set(item.id, item);
        return [...map.values()].sort(
          (a, b) => new Date(b.lastMessage.at ?? 0).getTime() - new Date(a.lastMessage.at ?? 0).getTime(),
        );
      });
      setStats(counters);
      setNextCursor((current) => current ?? cursor);
      setError(null);

      // A push notification deep-links here with ?c=<uid>; open that thread.
      const wanted = new URLSearchParams(window.location.search).get("c");
      if (wanted && list.some((item) => item.id === wanted)) {
        setSelected((current) => current ?? wanted);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Couldn't load conversations.");
    }
  }, []);

  /** Loads the next page of older conversations. */
  const loadMore = useCallback(async () => {
    if (!nextCursor) return;
    try {
      const { conversations: older, nextCursor: cursor } = await adminApi.conversations(nextCursor);
      setConversations((current) => {
        const map = new Map(current.map((item) => [item.id, item]));
        for (const item of older) map.set(item.id, item);
        return [...map.values()];
      });
      setNextCursor(cursor);
    } catch {
      setNextCursor(null);
    }
  }, [nextCursor]);

  // Poll the inbox while the tab is visible; nothing runs in the background.
  useEffect(() => {
    if (access !== "granted") return;
    void refresh();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 4000);
    return () => clearInterval(timer);
  }, [access, refresh, nextCursor]);

  // Notification sound for genuinely new unread messages.
  const lastTotalUnread = useRef(0);
  useEffect(() => {
    if (!stats) return;
    if (stats.unread > lastTotalUnread.current && soundOn) {
      const AudioCtx =
        typeof window !== "undefined"
          ? window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
          : undefined;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 660;
        gain.gain.setValueAtTime(0.06, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      }
    }
    lastTotalUnread.current = stats.unread;
  }, [stats, soundOn]);

  const filtered = useMemo(() => {
    let list = [...conversations];
    if (search.trim()) {
      const term = search.trim().toLowerCase();
      list = list.filter(
        (c) =>
          c.customer.name.toLowerCase().includes(term) ||
          c.customer.email?.toLowerCase().includes(term) ||
          c.lastMessage.text.toLowerCase().includes(term),
      );
    }
    if (filter === "unreplied") list = list.filter((c) => c.awaitingAdminReply);
    if (filter === "unread") list = list.filter((c) => c.unreadForAdmin > 0);
    if (filter === "replied") list = list.filter((c) => !c.awaitingAdminReply);
    if (filter === "active") list = list.filter((c) => isOnline(c.lastActiveAt));
    return list.sort(
      (a, b) => new Date(b.lastMessage.at ?? 0).getTime() - new Date(a.lastMessage.at ?? 0).getTime(),
    );
  }, [conversations, filter, search]);

  if (loading || access === "checking") {
    return (
      <div className="mx-auto flex h-[60vh] max-w-5xl items-center justify-center">
        <Loader2 className="size-6 animate-spin text-brand" />
      </div>
    );
  }

  if (access !== "granted") {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-20 text-center">
        <span className="grid size-14 place-items-center rounded-full bg-destructive/10 text-destructive">
          <ShieldAlert className="size-7" />
        </span>
        <h1 className="text-xl font-bold text-ink">Admins only</h1>
        <p className="text-sm text-ink-soft">
          This account isn&apos;t authorised for the admin panel. Ask the store owner to add your email, then sign
          in again.
        </p>
        <Link href="/" className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white">
          Back to shop
        </Link>
      </div>
    );
  }

  const current = conversations.find((c) => c.id === selected) ?? null;

  return (
    <div className="flex h-[calc(100dvh-9rem)] min-h-[32rem] flex-col gap-3">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-extrabold tracking-tight text-ink sm:text-xl">Admin · Messages</h1>
          <p className="text-xs text-ink-soft">Signed in as {user?.email}</p>
        </div>
        <div className="flex items-center gap-2">
          <EnablePushButton className="mr-1" />
          <button
            type="button"
            onClick={() => setSoundOn((value) => !value)}
            className={cn(
              "inline-flex h-9 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-bold",
              soundOn ? "border-brand bg-brand-tint text-brand" : "border-border text-ink-soft",
            )}
          >
            <Bell className="size-3.5" />
            {soundOn ? "Sound on" : "Sound off"}
          </button>
          <button
            type="button"
            onClick={() => void refresh()}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-2.5 text-xs font-bold text-ink-soft"
          >
            <RefreshCw className="size-3.5" />
            Refresh
          </button>
        </div>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        <Stat icon={MessageSquare} label="Chats" value={stats?.conversations ?? 0} />
        <Stat icon={Users} label="Customers" value={stats?.customers ?? 0} />
        <Stat icon={Inbox} label="Messages" value={stats?.messages ?? 0} />
        <Stat icon={MailOpen} label="Unread" value={stats?.unread ?? 0} tone="brand" />
        <Stat icon={Bell} label="Unreplied" value={stats?.awaitingReply ?? 0} tone="warn" />
        <Stat icon={Signal} label="Active" value={stats?.active ?? 0} />
        <Stat icon={CheckCheck} label="Today" value={stats?.today ?? 0} />
      </div>

      {error ? (
        <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          {error}
        </p>
      ) : null}

      {/* Split view */}
      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[22rem_minmax(0,1fr)]">
        {/* Inbox */}
        <section
          className={cn(
            "flex min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-white",
            current ? "hidden lg:flex" : "flex",
          )}
        >
          <div className="border-b border-border p-2">
            <label className="relative block">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-ink-soft" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search customers…"
                className="h-9 w-full rounded-lg border border-border bg-surface-2 pl-8 text-xs outline-none focus:border-brand focus:bg-white"
              />
            </label>
            <div className="mt-2 flex flex-wrap gap-1">
              {FILTERS.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFilter(key)}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[11px] font-bold transition",
                    filter === key ? "bg-brand text-white" : "bg-surface-2 text-ink-soft hover:text-ink",
                  )}
                >
                  {label}
                  {key === "unread" && stats?.unread ? ` ${stats.unread}` : ""}
                  {key === "unreplied" && stats?.awaitingReply ? ` ${stats.awaitingReply}` : ""}
                </button>
              ))}
            </div>
          </div>

          <ul className="flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <li className="p-6 text-center text-xs text-ink-soft">No conversations in this view.</li>
            ) : null}
            {filtered.map((conversation) => {
              const active = conversation.id === selected;
              return (
                <li key={conversation.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(conversation.id)}
                    className={cn(
                      "flex w-full items-start gap-2.5 border-b border-border px-3 py-2.5 text-left transition",
                      active ? "bg-brand-tint" : "hover:bg-surface-2",
                    )}
                  >
                    <span className="relative shrink-0">
                      <span className="grid size-9 place-items-center rounded-full bg-brand/10 text-xs font-extrabold text-brand">
                        {(conversation.customer.name || "C").slice(0, 1).toUpperCase()}
                      </span>
                      <span
                        className={cn(
                          "absolute right-0 bottom-0 size-2.5 rounded-full border-2 border-white",
                          isOnline(conversation.lastActiveAt) ? "bg-stock" : "bg-ink-soft/40",
                        )}
                      />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate text-xs font-bold text-ink">{conversation.customer.name}</span>
                        <span className="ml-auto shrink-0 text-[10px] text-ink-soft">
                          {relative(conversation.lastMessage.at)}
                        </span>
                      </span>
                      <span className="mt-0.5 flex items-center gap-1">
                        {conversation.lastMessage.senderRole === "admin" ? (
                          <span className="shrink-0 text-[10px] font-bold text-ink-soft">You:</span>
                        ) : null}
                        <span className="truncate text-[11px] text-ink-soft">{conversation.lastMessage.text}</span>
                      </span>
                      <span className="mt-0.5 flex items-center gap-1">
                        {conversation.unreadForAdmin > 0 ? (
                          <span className="rounded-full bg-brand px-1.5 text-[9px] font-extrabold text-white">
                            {conversation.unreadForAdmin}
                          </span>
                        ) : null}
                        {conversation.awaitingAdminReply ? (
                          <span className="rounded-full bg-[#fff1e5] px-1.5 text-[9px] font-extrabold text-[#b34a12]">
                            Needs reply
                          </span>
                        ) : null}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
            {nextCursor ? (
              <li className="p-2">
                <button
                  type="button"
                  onClick={() => void loadMore()}
                  className="w-full rounded-lg border border-border py-2 text-[11px] font-bold text-ink-soft transition hover:border-brand hover:text-brand"
                >
                  Load older conversations
                </button>
              </li>
            ) : null}
          </ul>
        </section>

        {/* Chat */}
        <section className={cn("min-h-0", current ? "flex" : "hidden lg:flex")}>
          {current ? (
            <AdminChat
              key={current.id}
              conversation={current}
              onBack={() => setSelected(null)}
              onChanged={() => void refresh()}
            />
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-white text-center">
              <Inbox className="size-8 text-ink-soft" />
              <p className="text-sm font-semibold text-ink">Select a conversation</p>
              <p className="max-w-xs text-xs text-ink-soft">
                Customers waiting for a reply are marked “Needs reply”.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Inbox;
  label: string;
  value: number;
  tone?: "brand" | "warn";
}) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-white px-2.5 py-2",
        tone === "brand" ? "border-brand/30" : tone === "warn" ? "border-[#f36d25]/30" : "border-border",
      )}
    >
      <p className="flex items-center gap-1 text-[10px] font-bold tracking-wide text-ink-soft uppercase">
        <Icon className="size-3" />
        {label}
      </p>
      <p
        className={cn(
          "mt-0.5 text-lg leading-none font-extrabold",
          tone === "brand" ? "text-brand" : tone === "warn" ? "text-[#b34a12]" : "text-ink",
        )}
      >
        {value}
      </p>
    </div>
  );
}

/** Joins the saved address fields into the one line a rep reads out. */
function fullAddress(customer: AdminCustomerProfile): string {
  const p = customer.profile;
  return [p.buildingStreet, p.locality, p.area, p.city, p.region, p.address]
    .filter((part) => part && part.trim())
    .join(", ");
}

function AdminChat({
  conversation,
  onBack,
  onChanged,
}: {
  conversation: PublicConversation;
  onBack: () => void;
  onChanged: () => void;
}) {
  const { messages, loading, hasMore, loadOlder, merge, sendOptimistic, dropOptimistic } = useLiveMessages({
    conversationUid: conversation.id,
    admin: true,
  });
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [replyTo, setReplyTo] = useState<PublicMessage | null>(null);
  // Customer details power the quick-message templates (address, phone, order).
  const [customer, setCustomer] = useState<AdminCustomerProfile | null>(null);
  // Messages hidden immediately after an admin deletes them.
  const [deleted, setDeleted] = useState<Set<string>>(() => new Set());
  // Quick messages quote prices in the same currency as the rest of the site.
  const { currency } = useCurrency();

  useEffect(() => {
    let active = true;
    adminApi
      .profile(conversation.id)
      .then((data) => {
        if (active) setCustomer(data);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [conversation.id]);
  const [orderStatuses, setOrderStatuses] = useState<Record<string, ChatOrderStatus>>({});

  // Order statuses come from the customer's order records, keyed by reference.
  const loadOrderStatuses = useCallback(async () => {
    try {
      const profile = await adminApi.profile(conversation.id);
      const next: Record<string, ChatOrderStatus> = {};
      for (const order of profile.orders) next[order.reference] = order.status;
      setOrderStatuses(next);
    } catch {
      /* status is informative; never block the chat on it */
    }
  }, [conversation.id]);

  useEffect(() => {
    void loadOrderStatuses();
  }, [loadOrderStatuses]);

  async function changeOrderStatus(reference: string, next: ChatOrderStatus) {
    await adminApi.setOrderStatus(reference, next);
    setOrderStatuses((current) => ({ ...current, [reference]: next }));
    onChanged();
  }

  // Opening a thread clears its unread badge for the admin.
  useEffect(() => {
    void adminApi.markRead(conversation.id).then(onChanged).catch(() => { });
  }, [conversation.id, onChanged]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  async function reply(input: Parameters<typeof adminApi.reply>[1]) {
    const { message } = await adminApi.reply(conversation.id, input);
    merge([message]);
    onChanged();
  }

  /** Admin messages appear instantly too. */
  function optimistic(input: Omit<Parameters<typeof adminApi.reply>[1], "clientId">) {
    return sendOptimistic({
      conversationId: conversation.id,
      senderId: "admin-me",
      senderRole: "admin",
      senderName: "MT Store",
      senderPhoto: "/mt-store-avatar.png",
      kind: input.kind,
      text: input.text ?? "",
      attachment: input.attachment,
      replyTo: input.replyTo,
    });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-surface">
      <header className="flex items-center gap-2 border-b border-border bg-white px-2.5 py-2">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to inbox"
          className="grid size-8 shrink-0 place-items-center rounded-full text-ink-soft lg:hidden"
        >
          <ArrowLeft className="size-4" />
        </button>
        <span className="relative shrink-0">
          {conversation.customer.photoURL ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={conversation.customer.photoURL}
              alt=""
              className="size-8 rounded-full object-cover"
            />
          ) : (
            <span className="grid size-8 place-items-center rounded-full bg-brand/10 text-xs font-extrabold text-brand">
              {(conversation.customer.name || "C").slice(0, 1).toUpperCase()}
            </span>
          )}
          <span
            className={cn(
              "absolute right-0 bottom-0 size-2.5 rounded-full border-2 border-white",
              isOnline(conversation.lastActiveAt) ? "bg-stock" : "bg-ink-soft/40",
            )}
          />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-ink">{conversation.customer.name}</p>
          <p className="truncate text-[10px] text-ink-soft">
            {isOnline(conversation.lastActiveAt) ? "Online now" : `Last active ${relative(conversation.lastActiveAt)} ago`}
            {conversation.customer.email ? ` · ${conversation.customer.email}` : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowInfo(true)}
          className="shrink-0 rounded-lg border border-border px-2 py-1 text-[10px] font-bold text-ink-soft transition hover:border-brand hover:text-brand"
        >
          Customer info
        </button>
      </header>

      {showInfo ? (
        <CustomerInfoDrawer
          conversationUid={conversation.id}
          customerName={conversation.customer.name}
          onClose={() => setShowInfo(false)}
        />
      ) : null}

      <div ref={scrollRef} className="flex flex-1 flex-col gap-2 overflow-y-auto px-3 py-3">
        {hasMore ? (
          <button
            type="button"
            onClick={() => void loadOlder()}
            className="mx-auto rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-ink-soft shadow-sm"
          >
            Load older messages
          </button>
        ) : null}
        {loading && messages.length === 0 ? (
          <p className="py-6 text-center text-xs text-ink-soft">Loading history…</p>
        ) : null}
        {messages.filter((message) => !deleted.has(message.id)).map((message, index) => {
          const previous = messages[index - 1];
          const showDay =
            !previous || new Date(previous.createdAt).toDateString() !== new Date(message.createdAt).toDateString();
          return (
            <div key={message.id} className="flex flex-col gap-2">
              {showDay ? (
                <p className="mx-auto my-1 rounded-full bg-white px-2.5 py-0.5 text-[10px] font-bold text-ink-soft shadow-sm">
                  {formatDay(message.createdAt)}
                </p>
              ) : null}
              <MessageBubble
                message={message}
                mine={message.senderRole === "admin"}
                viewer="admin"
                showAvatar={!previous || previous.senderId !== message.senderId}
                onReply={setReplyTo}
                onDelete={async (target) => {
                  // Optimistic removal: the row disappears at once, the server call
                  // happens behind it.
                  setDeleted((current) => new Set(current).add(target.id));
                  try {
                    await adminApi.deleteMessage(conversation.id, target.id);
                    onChanged();
                  } catch {
                    setDeleted((current) => {
                      const next = new Set(current);
                      next.delete(target.id);
                      return next;
                    });
                  }
                }}
                orderStatus={
                  message.order ? (orderStatuses[message.order.reference] ?? "sent") : undefined
                }
                onOrderStatusChange={changeOrderStatus}
              />
            </div>
          );
        })}
      </div>

      <MessageComposer
        onSend={reply}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
        onOptimistic={optimistic}
        onRollback={dropOptimistic}
        toolbar={(insert) => (
          <QuickMessagePicker
            context={buildContext({
              name: customer?.profile.fullName ?? conversation.customer.name,
              address: customer ? fullAddress(customer) : conversation.customer.address,
              phone: customer?.profile.phoneNumber ?? conversation.customer.phone,
              email: customer?.profile.email ?? conversation.customer.email ?? null,
              orderReference: customer?.orders[0]?.reference ?? null,
              orderTotalUsd: customer?.orders[0]?.total ?? null,
              currency,
            })}
            onInsert={insert}
          />
        )}
      />
      <p className="border-t border-border bg-white px-3 py-1 text-center text-[10px] text-ink-soft">
        Replying as {MT_STORE.name} · your reply appears instantly for the customer
      </p>
    </div>
  );
}
