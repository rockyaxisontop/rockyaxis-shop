"use client";

import { useRef, useState } from "react";
import { ImageIcon, Loader2, Mic, Paperclip, Reply, Send, X } from "lucide-react";

import { messageApi, type SendInput } from "@/lib/messaging/client";
import type { PublicMessage } from "@/lib/messaging/types";

/**
 * Message composer: text, reply quoting, image picker, file attachments and a
 * real voice recorder (MediaRecorder → uploaded as an audio message).
 *
 * Files are uploaded straight to Storage via a short-lived signed URL from our
 * API, so big videos never pass through the app server.
 */
export function MessageComposer({
  onSend,
  disabled,
  replyTo,
  onCancelReply,
}: {
  onSend: (input: SendInput) => Promise<void>;
  disabled?: boolean;
  /** The message being replied to, if any. */
  replyTo?: PublicMessage | null;
  onCancelReply?: () => void;
}) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);

  const fileInput = useRef<HTMLInputElement>(null);
  const imageInput = useRef<HTMLInputElement>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const recordTimer = useRef<ReturnType<typeof setInterval> | null>(null);

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
    setSending(true);
    setError(null);
    try {
      await onSend({ kind: "text", text: value, replyTo: replyPayload });
      setText("");
      onCancelReply?.();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Couldn't send. Try again.");
    } finally {
      setSending(false);
    }
  }

  async function upload(file: File, duration?: number) {
    setUploading(true);
    setError(null);
    try {
      const ticket = await messageApi.uploadUrl({
        name: file.name,
        contentType: file.type || "application/octet-stream",
        size: file.size,
      });

      const put = await fetch(ticket.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!put.ok) throw new Error("Upload failed. Try a smaller file.");

      await onSend({
        kind: ticket.kind,
        text: text.trim() || undefined,
        attachment: {
          url: ticket.url,
          name: file.name,
          contentType: file.type || "application/octet-stream",
          size: file.size,
          ...(duration ? { duration } : {}),
        },
        replyTo: replyPayload,
      });
      setText("");
      onCancelReply?.();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Couldn't upload that file.");
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
      if (imageInput.current) imageInput.current.value = "";
    }
  }

  async function startRecording() {
    if (recorder.current) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("Voice messages aren't supported in this browser.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const media = new MediaRecorder(stream);
      chunks.current = [];
      media.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.current.push(event.data);
      };
      media.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        const seconds = recordSeconds;
        const type = chunks.current[0]?.type || "audio/webm";
        const blob = new Blob(chunks.current, { type });
        if (blob.size > 1000) {
          const file = new File([blob], `voice-${Date.now()}.webm`, { type });
          void upload(file, Math.max(1, seconds));
        }
        setRecording(false);
        setRecordSeconds(0);
      };
      media.start();
      recorder.current = media;
      setRecording(true);
      setRecordSeconds(0);
      setError(null);
      recordTimer.current = setInterval(() => setRecordSeconds((value) => value + 1), 1000);
    } catch {
      setError("Microphone access was blocked.");
      setRecording(false);
    }
  }

  function stopRecording(cancel = false) {
    if (recordTimer.current) clearInterval(recordTimer.current);
    recordTimer.current = null;
    const media = recorder.current;
    recorder.current = null;
    if (!media) return;
    if (cancel) chunks.current = [];
    media.stop();
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

      {recording ? (
        <div className="flex items-center gap-2 rounded-xl bg-destructive/5 px-2 py-2">
          <span className="size-2.5 animate-pulse rounded-full bg-destructive" />
          <p className="text-xs font-bold text-destructive">
            Recording {String(Math.floor(recordSeconds / 60)).padStart(2, "0")}:
            {String(recordSeconds % 60).padStart(2, "0")}
          </p>
          <div className="ml-auto flex gap-1.5">
            <button
              type="button"
              onClick={() => stopRecording(true)}
              className="rounded-lg px-2 py-1 text-[11px] font-bold text-ink-soft hover:bg-white"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => stopRecording(false)}
              className="inline-flex items-center gap-1 rounded-lg bg-brand px-2.5 py-1 text-[11px] font-extrabold text-white"
            >
              <Send className="size-3" />
              Send
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-end gap-1">
          <input
            ref={fileInput}
            type="file"
            hidden
            accept=".pdf,.doc,.docx,.xls,.xlsx,.zip,.txt,video/*,audio/*"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void upload(file);
            }}
          />
          <input
            ref={imageInput}
            type="file"
            hidden
            accept="image/*"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void upload(file);
            }}
          />

          <ComposerButton
            label="Send a picture"
            onClick={() => imageInput.current?.click()}
            disabled={busy}
          >
            <ImageIcon className="size-5" />
          </ComposerButton>
          <ComposerButton
            label="Record a voice message"
            onClick={() => void startRecording()}
            disabled={busy}
          >
            <Mic className="size-5" />
          </ComposerButton>
          <ComposerButton label="Attach a file" onClick={() => fileInput.current?.click()} disabled={busy}>
            {uploading ? <Loader2 className="size-5 animate-spin" /> : <Paperclip className="size-5" />}
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
      )}
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

