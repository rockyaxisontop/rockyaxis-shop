"use client";

import { useRef, useState } from "react";
import { FileText, ImageIcon, Loader2, Reply, Send, X } from "lucide-react";

import { messageApi, type SendInput } from "@/lib/messaging/client";
import type { PublicMessage } from "@/lib/messaging/types";

/**
 * Message composer: text, reply quoting, one media button (photos AND videos)
 * and one attachment button for documents.
 *
 * Files upload straight to the configured provider (Cloudinary, via a signed
 * ticket from our API) so large videos never pass through the app server.
 */
export function MessageComposer({
  onSend,
  disabled,
  replyTo,
  onCancelReply,
  onOptimistic,
  onRollback,
}: {
  onSend: (input: SendInput) => Promise<void>;
  disabled?: boolean;
  /** The message being replied to, if any. */
  replyTo?: PublicMessage | null;
  onCancelReply?: () => void;
  /** Render the message before the request completes; returns a draft id. */
  onOptimistic?: (input: Omit<SendInput, "clientId">) => string | undefined;
  /** Remove a draft whose send failed. */
  onRollback?: (clientId: string) => void;
}) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const fileInput = useRef<HTMLInputElement>(null);
  const mediaInput = useRef<HTMLInputElement>(null);

  /** Builds the reply preview the server stores alongside the message. */
  const replyPayload = replyTo
    ? {
      messageId: replyTo.id,
      senderName: replyTo.senderName,
      kind: replyTo.kind,
      snippet:
        replyTo.kind === "order"
          ? `Order ${replyTo.order?.reference ?? ""}`
          : (replyTo.text || replyTo.attachment?.name || "").slice(0, 140),
    }
    : undefined;

  async function submit() {
    const value = text.trim();
    if (!value || sending) return;

    // Clear the box and show the message immediately; the network happens behind
    // the scenes. If it fails, the bubble is removed and the text restored.
    const clientId = onOptimistic?.({
      kind: "text",
      text: value,
      replyTo: replyPayload,
    });
    setText("");
    onCancelReply?.();
    setSending(true);
    setError(null);

    try {
      await onSend({ kind: "text", text: value, replyTo: replyPayload, clientId });
    } catch (cause) {
      if (clientId) onRollback?.(clientId);
      setText(value);
      setError(cause instanceof Error ? cause.message : "Couldn't send. Try again.");
    } finally {
      setSending(false);
    }
  }

  async function upload(file: File) {
    setUploading(true);
    setError(null);
    try {
      const contentType = file.type || "application/octet-stream";
      const ticket = await messageApi.uploadUrl({ name: file.name, contentType, size: file.size });

      let url: string;
      if (ticket.provider === "cloudinary") {
        // Cloudinary's unsigned-style endpoint: signature fields + the file.
        const form = new FormData();
        form.append("file", file);
        for (const [key, value] of Object.entries(ticket.fields)) form.append(key, value);

        const response = await fetch(ticket.uploadUrl, { method: "POST", body: form });
        const payload = (await response.json().catch(() => ({}))) as {
          secure_url?: string;
          url?: string;
          error?: { message?: string };
        };
        if (!response.ok || !(payload.secure_url ?? payload.url)) {
          throw new Error(payload.error?.message ?? "Upload failed. Try a smaller file.");
        }
        url = payload.secure_url ?? payload.url!;
      } else {
        const put = await fetch(ticket.uploadUrl, { method: "PUT", headers: { "Content-Type": contentType }, body: file });
        if (!put.ok) throw new Error("Upload failed. Try a smaller file.");
        url = ticket.url;
      }

      await onSend({
        kind: ticket.kind,
        text: text.trim() || undefined,
        attachment: { url, name: file.name, contentType, size: file.size },
        replyTo: replyPayload,
      });
      setText("");
      onCancelReply?.();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Couldn't upload that file.");
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
      if (mediaInput.current) mediaInput.current.value = "";
    }
  }

  const busy = disabled || uploading || sending;

  return (
    <div className="border-t border-border bg-white p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      {/* Quoted message being answered */}
      {replyTo ? (
        <div className="mb-1.5 flex items-center gap-2 rounded-lg border border-brand/30 bg-brand-tint px-2.5 py-1.5">
          <Reply className="size-3.5 shrink-0 text-brand" />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold text-brand">{replyTo.senderName}</p>
            <p className="truncate text-[11px] text-ink-soft">
              {replyTo.kind === "order" ? `Order ${replyTo.order?.reference ?? ""}` : replyTo.text || "Attachment"}
            </p>
          </div>
          <button
            type="button"
            onClick={onCancelReply}
            aria-label="Cancel reply"
            className="grid size-6 place-items-center rounded-full text-ink-soft hover:bg-white"
          >
            <X className="size-3.5" />
          </button>
        </div>
      ) : null}

      {error ? <p className="px-2 pb-1 text-[11px] text-destructive">{error}</p> : null}

      <div className="flex items-end gap-1">
        <input
          ref={fileInput}
          type="file"
          hidden
          accept=".pdf,.doc,.docx,.xls,.xlsx,.zip,.txt,.csv"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void upload(file);
          }}
        />
        <input
          ref={mediaInput}
          type="file"
          hidden
          accept="image/*,video/*"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void upload(file);
          }}
        />

        {/* One attachment button: documents. */}
        <ComposerButton label="Attach a file" onClick={() => fileInput.current?.click()} disabled={busy}>
          <FileText className="size-5" />
        </ComposerButton>
        {/* One media button: photos and videos in the same picker. */}
        <ComposerButton
          label="Send a photo or video"
          onClick={() => mediaInput.current?.click()}
          disabled={busy}
        >
          {uploading ? <Loader2 className="size-5 animate-spin" /> : <ImageIcon className="size-5" />}
        </ComposerButton>

        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void submit();
            }
          }}
          rows={1}
          placeholder={replyTo ? `Reply to ${replyTo.senderName}…` : "Write a message…"}
          disabled={disabled}
          className="max-h-32 min-h-10 flex-1 resize-none rounded-2xl border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/15"
        />
        <button
          type="button"
          onClick={() => void submit()}
          disabled={busy || !text.trim()}
          aria-label="Send message"
          className="grid size-10 shrink-0 place-items-center rounded-full bg-brand text-white transition hover:brightness-110 disabled:opacity-40"
        >
          {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        </button>
      </div>
    </div>
  );
}

function ComposerButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="grid size-9 shrink-0 place-items-center rounded-full text-ink-soft transition hover:bg-surface-2 hover:text-brand disabled:opacity-40"
    >
      {children}
    </button>
  );
}

