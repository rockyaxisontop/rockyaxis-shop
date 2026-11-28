"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, House, ShieldCheck, ShoppingBag, UserRound } from "lucide-react";

import { useAuth } from "@/components/providers";
import {
  MT_STORE,
  MessageBubble,
  formatDay,
  useLiveMessages,
} from "@/components/messaging/chat-parts";
import { MessageComposer } from "@/components/messaging/composer";
import { MtStoreAvatar } from "@/components/messaging/mt-store-avatar";
import { messageApi } from "@/lib/messaging/client";
import { InstallAppBanner } from "@/components/messaging/install-app-banner";
import { useCartOrderState, CartOrderSummary } from "@/components/messaging/cart-order-status";
import type { PublicMessage } from "@/lib/messaging/types";
import { askForPushOnce, getPushStatus } from "@/lib/messaging/push-client";
import type { PublicConversation } from "@/lib/messaging/types";

/**
 * Customer's chat with MT Store at /message.
 *
 * Opening this page with `?order=auto` (or with items in the cart, when arriving
 * from "Order Now") sends the cart as a single order message. The server derives
 * the payload from the buyer's own cart and de-duplicates it, so refreshing the
 * page never posts the same order twice.
 */
export function MessagePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [conversation, setConversation] = useState<PublicConversation | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const orderSent = useRef(false);
  // Live status of every order this customer has sent, shown on the cards.
  const { orders } = useCartOrderState();

  const { messages, loading: messagesLoading, hasMore, loadOlder, merge, sendOptimistic, dropOptimistic } = useLiveMessages({
    conversationUid: user?.uid ?? null,
    admin: false,
  });
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.replace(`/login?next=${encodeURIComponent("/message")}`);
    }
  }, [loading, router, user]);

  const bootstrap = useCallback(async () => {
    try {
      const { conversation: found } = await messageApi.getConversation();
      setConversation(found);
      setState("ready");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Couldn't open the chat.");
      setState("error");
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    void bootstrap();
  }, [bootstrap, user]);

  // Send the order once per visit, only when arriving from "Order Now".
  useEffect(() => {
    if (state !== "ready" || orderSent.current) return;
    const wantsOrder = new URLSearchParams(window.location.search).get("order") === "auto";
    if (!wantsOrder) return;
    orderSent.current = true;

    // A single "Buy this item" passes just that cart row; otherwise the whole cart.
    const itemId = new URLSearchParams(window.location.search).get("item") ?? undefined;

    void messageApi
      .sendOrder(itemId ? [itemId] : undefined)
      .then(({ message }) => {
        merge([message]);
        // Drop the flag so a manual refresh doesn't resend.
        router.replace("/message");
      })
      .catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : "Couldn't send your order.");
      });
  }, [merge, router, state]);

  // Prompt for notifications on the customer's first tap. Browsers ignore
  // permission prompts that fire without a gesture.
  //
  // The `mt-store:push-asked` flag is NOT remembered here: someone whose browser
  // blocked the prompt once (or who dismissed the site-wide nudge) still deserves
  // a real chance in the chat, which is exactly where they want replies. The
  // flag is only used to skip a prompt that would be ignored anyway.
  const [pushSettled, setPushSettled] = useState(false);
  useEffect(() => {
    if (state !== "ready") return;

    let cleanup: (() => void) | undefined;
    let cancelled = false;

    void getPushStatus()
      .then((status) => {
        if (cancelled) return;
        // Already granted or blocked: nothing can be asked, so don't gate the
        // install banner on a prompt that will never appear.
        if (status !== "default") {
          setPushSettled(true);
          return;
        }
        cleanup = askForPushOnce(() => setPushSettled(true));
      })
      .catch(() => setPushSettled(true));

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [state]);

  // Clear the unread badge for MT Store's replies while the thread is open.
  useEffect(() => {
    if (state !== "ready") return;
    const mark = () => {
      if (document.visibilityState === "visible") void messageApi.markRead().catch(() => { });
    };
    mark();
    const timer = setInterval(mark, 8000);
    return () => clearInterval(timer);
  }, [state]);

  // Stick to the newest message.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  const [replyTo, setReplyTo] = useState<PublicMessage | null>(null);
  const [identityOpen, setIdentityOpen] = useState(false);

  async function send(input: Parameters<typeof messageApi.send>[0]) {
    const { message } = await messageApi.send(input);
    merge([message]);
  }

  /** Paints the bubble before the network call so the chat feels instant. */
  function optimistic(input: Omit<Parameters<typeof messageApi.send>[0], "clientId">) {
    return sendOptimistic({
      conversationId: user!.uid,
      senderId: user!.uid,
      senderRole: "customer",
      senderName: user!.displayName ?? user!.email?.split("@")[0] ?? "You",
      senderPhoto: user!.photoURL ?? undefined,
      kind: input.kind,
      text: input.text ?? "",
      attachment: input.attachment,
      replyTo: input.replyTo,
    });
  }

  if (loading || state === "loading" || !user) {
    return (
      <div className="mx-auto flex h-[60vh] max-w-2xl items-center justify-center">
        <span className="size-6 animate-spin rounded-full border-2 border-brand border-t-transparent" />
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-16 text-center">
        <h1 className="text-lg font-bold text-ink">Chat isn&apos;t available</h1>
        <p className="text-sm text-ink-soft">{error}</p>
        <Link href="/" className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white">
          Back to shop
        </Link>
      </div>
    );
  }

  return (
    // Fills exactly one screen: no page scroll, only the message list scrolls.
    <div className="mx-auto flex h-[calc(100dvh-0.5rem)] min-h-0 w-full max-w-2xl flex-col overflow-hidden bg-surface sm:h-[calc(100dvh-3rem)] sm:rounded-2xl sm:border sm:border-border sm:shadow-sm">
      {/* Header — fixed height so typing never reflows it. */}
      <header className="flex shrink-0 items-center gap-2 border-b border-border bg-white px-2 py-2">
        {/* Proper back: history if there is any, otherwise the cart. */}
        <button
          type="button"
          onClick={() => {
            if (window.history.length > 1) router.back();
            else router.push("/cart");
          }}
          aria-label="Go back"
          className="grid size-9 shrink-0 place-items-center rounded-full text-ink-soft transition hover:bg-surface-2 hover:text-ink active:scale-95"
        >
          <ArrowLeft className="size-4" />
        </button>
        <MtStoreAvatar size={34} online open={identityOpen} onOpenChange={setIdentityOpen} />
        <div className="min-w-0 flex-1">
          <button
            type="button"
            data-store-identity-trigger
            onClick={() => setIdentityOpen((value) => !value)}
            aria-expanded={identityOpen}
            className="flex items-center gap-1 text-left text-[13px] font-extrabold text-ink hover:text-brand"
          >
            {MT_STORE.name}
            <ShieldCheck className="size-3.5 text-brand" aria-label="Official account" />
          </button>
          <p className="truncate text-[10px] text-ink-soft">
            {conversation?.lastMessage.at ? "Online · replies in minutes" : MT_STORE.tagline}
          </p>
        </div>

        {/* Three quick actions: cart, home, profile. */}
        <div className="flex shrink-0 items-center gap-1">
          <Link
            href="/cart"
            aria-label="My cart"
            title="My cart"
            className="inline-flex h-9 items-center gap-1 rounded-lg border border-border px-2 text-[11px] font-bold text-ink transition hover:border-brand hover:text-brand active:scale-95"
          >
            <ShoppingBag className="size-4" />
            <span className="hidden min-[380px]:inline">Cart</span>
          </Link>
          <Link
            href="/"
            aria-label="Home"
            title="Home"
            className="grid size-9 place-items-center rounded-lg border border-border text-ink transition hover:border-brand hover:text-brand active:scale-95"
          >
            <House className="size-4" />
          </Link>
          <Link
            href="/profile"
            aria-label="Your profile"
            title="Your profile"
            className="grid size-9 place-items-center rounded-lg border border-border text-ink transition hover:border-brand hover:text-brand active:scale-95"
          >
            <UserRound className="size-4" />
          </Link>
        </div>
      </header>

      {/* Paid vs. remaining, so the customer never has to scroll to find out. */}
      {orders.length > 0 ? (
        <div className="border-b border-border bg-white px-2 py-1.5">
          <CartOrderSummary orders={orders} />
        </div>
      ) : null}

      {/* Messages — the ONLY scrolling region, so typing never moves the page. */}
      <div
        ref={scrollRef}
        className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-contain px-3 py-3"
      >
        {hasMore ? (
          <button
            type="button"
            onClick={() => void loadOlder()}
            className="mx-auto rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-ink-soft shadow-sm"
          >
            Load older messages
          </button>
        ) : null}

        {messagesLoading && messages.length === 0 ? (
          <p className="py-8 text-center text-xs text-ink-soft">Loading messages…</p>
        ) : null}

        {messages.map((message, index) => {
          const previous = messages[index - 1];
          const showDay =
            !previous || new Date(previous.createdAt).toDateString() !== new Date(message.createdAt).toDateString();
          // Show the store's avatar on every received message: in a 1-to-1
          // thread there is only one other party, so the old "grouping" rule
          // left whole runs of bubbles with no picture at all.
          const showAvatar = message.senderRole !== "customer";

          return (
            <div key={message.id} className="flex flex-col gap-2">
              {showDay ? (
                <p className="mx-auto my-1 rounded-full bg-white px-2.5 py-0.5 text-[10px] font-bold text-ink-soft shadow-sm">
                  {formatDay(message.createdAt)}
                </p>
              ) : null}
              <MessageBubble
                message={message}
                mine={message.senderRole === "customer"}
                viewer="customer"
                showAvatar={showAvatar}
                onReply={setReplyTo}
                orderStatus={
                  message.order
                    ? orders.find((order) => order.reference === message.order!.reference)?.status
                    : undefined
                }
              />
            </div>
          );
        })}

        {error ? (
          <p role="alert" className="mx-auto rounded-lg bg-destructive/10 px-3 py-1.5 text-[11px] text-destructive">
            {error}
          </p>
        ) : null}
      </div>

      {/* Composer + banner are pinned at the bottom with nothing after them, so
          there is nothing below the install banner to scroll to. */}
      <div className="shrink-0">
        <MessageComposer
          onSend={send}
          replyTo={replyTo}
          onCancelReply={() => setReplyTo(null)}
          onOptimistic={optimistic}
          onRollback={dropOptimistic}
        />

        {/* Asked as soon as the chat opens (once the notification prompt has been
            answered, so the two never collide) rather than waiting for a few
            messages — by the time someone is in the chat they clearly intend to
            come back. Dismissal is remembered. */}
        <InstallAppBanner
          messageCount={pushSettled ? Math.max(1, messages.filter((message) => message.senderRole === "customer").length) : 0}
        />
      </div>
    </div>
  );
}
