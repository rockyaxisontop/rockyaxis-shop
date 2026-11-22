import { NextResponse } from "next/server";

import { ApiError, apiErrorResponse, requireUser } from "@/lib/firebase/admin";
import { sendCustomerMessage } from "@/lib/messaging/service";
import type { Attachment, MessageKind } from "@/lib/messaging/types";

export const dynamic = "force-dynamic";

const KINDS: MessageKind[] = ["text", "image", "video", "audio", "file"];

/**
 * POST /api/messages/conversation/messages
 * { kind, text?, attachment? } — the customer writes to MT Store.
 */
export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    const body = (await request.json().catch(() => ({}))) as {
      kind?: MessageKind;
      text?: string;
      attachment?: Attachment;
    };

    const kind = body.kind && KINDS.includes(body.kind) ? body.kind : "text";
    const text = (body.text ?? "").trim();

    // Order messages go through their own endpoint, which builds the payload
    // server-side; here we require some real content.
    if (!text && !body.attachment) {
      throw new ApiError("Write a message first.", 400);
    }
    if (text.length > 4000) throw new ApiError("That message is too long.", 400);

    const message = await sendCustomerMessage(user, {
      kind,
      text,
      attachment: body.attachment ? sanitizeAttachment(body.attachment) : undefined,
    });

    return NextResponse.json({ message });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

function sanitizeAttachment(input: Attachment): Attachment {
  const url = typeof input?.url === "string" ? input.url : "";
  // Only accept files our own upload endpoint issued.
  if (!url.startsWith("https://") && !url.startsWith("/")) {
    throw new ApiError("That attachment is not valid.", 400);
  }
  return {
    url,
    name: String(input.name ?? "Attachment").slice(0, 200),
    contentType: String(input.contentType ?? "application/octet-stream").slice(0, 120),
    size: Number.isFinite(input.size) ? Number(input.size) : 0,
  };
}
