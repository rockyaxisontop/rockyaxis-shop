"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, ShieldCheck } from "lucide-react";

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
import type { PublicMessage } from "@/lib/messaging/types";
import { askForPushOnce } from "@/lib/messaging/push-client";
import type { PublicConversation } from "@/lib/messaging/types";
import { cn } from "@/lib/utils";

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

  const { messages, loading: messagesLoading, hasMore, loadOlder, merge } = useLiveMessages({
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

  // First visit: prompt for notifications on the customer's first tap. Browsers
  // ignore permission prompts that fire without a gesture.
  const [pushSettled, setPushSettled] = useState(false);
  useEffect(() => {
    if (state !== "ready") return;
    // If the permission was already decided (or asked before), don't hold the
    // install banner hostage to a prompt that will never appear.
    if (localStorage.getItem("mt-store:push-asked")) {
      setPushSettled(true);
      return;
    }
    const cleanup = askForPushOnce(() => setPushSettled(true));
    return cleanup;
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
    <div className="mx-auto flex h-[calc(100dvh-11rem)] min-h-[28rem] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border-border bg-surface shadow-sm sm:h-[calc(100dvh-12rem)]">
      {/* Header */}
      <header className="flex items-center gap-3 border-b border-border bg-white px-3 py-2.5">
        <Link
          href="/cart"
          aria-label="Back to cart"
          className="grid size-9 shrink-0 place-items-center rounded-full text-ink-soft transition hover:bg-surface-2 hover:text-ink"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <MtStoreAvatar size={36} online open={identityOpen} onOpenChange={setIdentityOpen} />
        <div className="min-w-0 flex-1">
          <button
            type="button"
            data-store-identity-trigger
            onClick={() => setIdentityOpen((value) => !value)}
            aria-expanded={identityOpen}
            className="flex items-center gap-1 text-left text-sm font-extrabold text-ink hover:text-brand"
          >
            {MT_STORE.name}
            <ShieldCheck className="size-3.5 text-brand" aria-label="Official account" />
          </button>
          <p className="truncate text-[11px] text-ink-soft">
            {conversation?.lastMessage.at ? "Online · replies in minutes" : MT_STORE.tagline}
          </p>
        </div>
        <Link
          href="/cart"
          className="shrink-0 rounded-lg border-border px-2.5 py-1.5 text-[11px] font-semibold text-ink transition hover:border-brand hover:text-brand"
        >
          My cart
        </Link>
      </header>

      {/* Messages */}
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

        {messagesLoading && messages.length === 0 ? (
          <p className="py-8 text-center text-xs text-ink-soft">Loading messages…</p>
        ) : null}

        {messages.map((message, index) => {
          const previous = messages[index - 1];
          const showDay =
            !previous || new Date(previous.createdAt).toDateString() !== new Date(message.createdAt).toDateString();
          const showAvatar =
            !previous || previous.senderId !== message.senderId ||
            new Date(message.createdAt).getTime() - new Date(previous.createdAt).getTime() > 300000;

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

      {/* Typing/read hint */}
      <div className={cn("flex items-center gap-1.5 px-4 pb-1 text-[10px] text-ink-soft", messages.length === 0 && "hidden")}>
        <Check className="size-3 text-brand" />
        Messages are seen by the MT Store team
      </div>

      <MessageComposer onSend={send} replyTo={replyTo} onCancelReply={() => setReplyTo(null)} />

      {/* Offered only after the customer has actually sent a couple of messages
          AND answered the notification prompt, so the two never collide. */}
      <InstallAppBanner
        messageCount={
          pushSettled ? messages.filter((message) => message.senderRole === "customer").length : 0
        }
      />
    </div>
  );
}
