import { NextResponse } from "next/server";

import { ApiError, apiErrorResponse, getAdminDb, requireUser } from "@/lib/firebase/admin";
import { requireAdmin } from "@/lib/messaging/service";

export const dynamic = "force-dynamic";

const CONVERSATIONS = "conversations";

/**
 * DELETE /api/admin/conversations/[uid]/messages/[messageId]
 *
 * Removes a message from a conversation (admin only).
 *
 * Admins do need to remove spam, duplicates and mistakes, but a delete must not
 * leave the inbox preview or unread badge lying. So this also rewrites the
 * conversation summary from the newest remaining message — all in one batch,
 * with no extra reads on the customer side.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ uid: string; messageId: string }> },
) {
  try {
    const user = await requireUser(request);
    await requireAdmin(user);

    const { uid, messageId } = await params;
    const db = getAdminDb();
    const conversationRef = db.collection(CONVERSATIONS).doc(uid);
    const messageRef = conversationRef.collection("messages").doc(messageId);

    const message = await messageRef.get();
    if (!message.exists) throw new ApiError("Message not found.", 404);

    await messageRef.delete();

    // Rebuild the preview from the newest remaining message.
    const remaining = await conversationRef
      .collection("messages")
      .orderBy("createdAt", "desc")
      .limit(1)
      .get();

    const last = remaining.docs[0]?.data();
    await conversationRef.set(
      {
        lastMessageText: last?.text ?? "",
        lastMessageKind: last?.kind ?? "text",
        lastSenderRole: last?.senderRole ?? "admin",
        lastMessageAt: last?.createdAt ?? null,
        // The count may drift by a few; it's a summary, never a billing figure.
        updatedAt: new Date(),
      },
      { merge: true },
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
