import { NextResponse } from "next/server";

import { ApiError, apiErrorResponse, getAdminBucket, requireUser } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";

/** 25 MB per attachment. */
const MAX_BYTES = 25 * 1024 * 1024;

const ALLOWED: Record<string, string> = {
  "image/": "image",
  "video/": "video",
  "audio/": "audio",
  "application/pdf": "file",
  "application/msword": "file",
  "application/vnd.openxmlformats-officedocument": "file",
  "application/zip": "file",
  "text/plain": "file",
};

/**
 * POST /api/messages/upload-url { name, contentType, size }
 *
 * Issues a short-lived signed URL so the browser uploads the file directly to
 * Storage. Files never pass through the app server, and the caller's uid is part
 * of the object path so one customer's uploads can never land in another's folder.
 */
export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    const body = (await request.json().catch(() => ({}))) as {
      name?: string;
      contentType?: string;
      size?: number;
    };

    const contentType = String(body.contentType ?? "");
    const size = Number(body.size ?? 0);
    const name = String(body.name ?? "file").replace(/[^\w.\-]+/g, "_").slice(0, 120);

    if (!contentType || !Object.keys(ALLOWED).some((prefix) => contentType.startsWith(prefix))) {
      throw new ApiError("That file type isn't supported.", 400);
    }
    if (!Number.isFinite(size) || size <= 0 || size > MAX_BYTES) {
      throw new ApiError("Files must be smaller than 25 MB.", 400);
    }

    const bucket = getAdminBucket();
    const path = `message-attachments/${user.uid}/${Date.now()}-${name}`;
    const [url] = await bucket.file(path).getSignedUrl({
      version: "v4",
      action: "write",
      expires: Date.now() + 10 * 60 * 1000,
      contentType,
    });

    // Download URLs are stable and work in <img>/<video> tags on both sides.
    const [downloadUrl] = await bucket.file(path).getSignedUrl({
      version: "v4",
      action: "read",
      expires: Date.now() + 365 * 24 * 60 * 60 * 1000,
    });

    return NextResponse.json({
      uploadUrl: url,
      url: downloadUrl,
      path,
      kind: ALLOWED[Object.keys(ALLOWED).find((prefix) => contentType.startsWith(prefix))!],
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
