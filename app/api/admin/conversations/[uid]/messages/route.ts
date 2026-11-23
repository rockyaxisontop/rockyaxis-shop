import { NextResponse } from "next/server";

import { ApiError, apiErrorResponse, requireUser } from "@/lib/firebase/admin";
import { listMessages, requireAdmin, sendAdminMessage } from "@/lib/messaging/service";
import type { Attachment, MessageKind, ReplyPreview } from "@/lib/messaging/types";
import { clientKey, rateLimit, tooManyRequests } from "@/lib/server/guard";

export const dynamic = "force-dynamic";

const KINDS: MessageKind[] = ["text", "image", "video", "audio", "file"];

/** GET /api/admin/conversations/[uid]/messages?before=<id> */
export async function GET(request: Request, { params }: { params: Promise<{ uid: string }> }) {
  try {
    const user = await requireUser(request);
    await requireAdmin(user);

    const { uid } = await params;
    const before = new URL(request.url).searchParams.get("before") ?? undefined;
    return NextResponse.json({ messages: await listMessages(uid, { before }) });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

/** POST /api/admin/conversations/[uid]/messages — the admin replies. */
export async function POST(request: Request, { params }: { params: Promise<{ uid: string }> }) {
  try {
    const user = await requireUser(request);
    await requireAdmin(user);

    // Generous for a human replying; stops a runaway client loop.
    const limit = rateLimit(`admin-send:${clientKey(request, user.uid)}`, 60, 60_000);
    if (!limit.allowed) return tooManyRequests(limit.retryAfter);

    const { uid } = await params;
    const body = (await request.json().catch(() => ({}))) as {
      kind?: MessageKind;
      text?: string;
      attachment?: Attachment;
      replyTo?: ReplyPreview;
      clientId?: string;
    };

    const kind = body.kind && KINDS.includes(body.kind) ? body.kind : "text";
    const text = (body.text ?? "").trim();
    if (!text && !body.attachment) throw new ApiError("Write a reply first.", 400);

    const message = await sendAdminMessage(user, uid, {
      kind,
      text,
      attachment: body.attachment,
      clientId: typeof body.clientId === "string" ? body.clientId.slice(0, 60) : undefined,
      replyTo: body.replyTo?.messageId
        ? {
            messageId: String(body.replyTo.messageId).slice(0, 100),
            senderName: String(body.replyTo.senderName ?? "").slice(0, 80),
            kind: KINDS.includes(body.replyTo.kind) ? body.replyTo.kind : "text",
            snippet: String(body.replyTo.snippet ?? "").slice(0, 140),
          }
        : undefined,
    });
    return NextResponse.json({ message });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
