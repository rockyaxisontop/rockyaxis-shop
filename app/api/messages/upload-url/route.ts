import { createHash } from "node:crypto";

import { NextResponse } from "next/server";

import { ApiError, apiErrorResponse, getAdminBucket, requireUser } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";

/** 25 MB per attachment — Cloudinary's free tier accepts up to 100 MB, we cap lower. */
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

/** Media goes to Cloudinary's image/video pipeline; documents go as raw files. */
function cloudResourceType(contentType: string, kind: string) {
  if (kind === "image") return "image";
  if (kind === "video" || kind === "audio") return "video";
  return "raw";
}

/**
 * POST /api/messages/upload-url { name, contentType, size }
 *
 * Returns a signed, direct-upload ticket. The browser uploads straight to the
 * storage provider — files never pass through the app server.
 *
 * Provider order:
 *   1. Cloudinary, when CLOUDINARY_CLOUD_NAME + CLOUDINARY_API_KEY +
 *      CLOUDINARY_API_SECRET are set (preferred: Firebase Storage is not enabled).
 *   2. Firebase Storage, as a fallback, so nothing breaks before Cloudinary is
 *      configured.
 *
 * In both cases the caller's uid is part of the path, so one customer's uploads
 * can never be written into another's folder.
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

    const match = Object.keys(ALLOWED).find((prefix) => contentType.startsWith(prefix));
    if (!contentType || !match) {
      throw new ApiError("That file type isn't supported.", 400);
    }
    if (!Number.isFinite(size) || size <= 0 || size > MAX_BYTES) {
      throw new ApiError("Files must be smaller than 25 MB.", 400);
    }
    const kind = ALLOWED[match];

    if (isCloudinaryConfigured()) {
      return NextResponse.json(cloudinaryTicket({ uid: user.uid, name, contentType, kind }));
    }

    return NextResponse.json(await storageTicket({ uid: user.uid, name, contentType, kind }));
  } catch (error) {
    return apiErrorResponse(error);
  }
}

function isCloudinaryConfigured() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET,
  );
}

/**
 * A signed Cloudinary upload ticket.
 *
 * The signature is SHA-1 of the sorted params + API secret, exactly as
 * Cloudinary specifies — it authorises this one folder and timestamp, so the
 * browser can post directly without ever seeing the API secret.
 */
function cloudinaryTicket({
  uid,
  name,
  contentType,
  kind,
}: {
  uid: string;
  name: string;
  contentType: string;
  kind: string;
}) {
  const cloud = process.env.CLOUDINARY_CLOUD_NAME!;
  const apiKey = process.env.CLOUDINARY_API_KEY!;
  const apiSecret = process.env.CLOUDINARY_API_SECRET!;

  const timestamp = Math.floor(Date.now() / 1000);
  const folder = `mt-store/messages/${uid}`;
  const resourceType = cloudResourceType(contentType, kind);

  // Params that are signed must match exactly what the browser sends, otherwise
  // Cloudinary rejects the upload with "Invalid Signature".
  const signatureParams: Record<string, string> = { folder, timestamp: String(timestamp) };
  const toSign = Object.keys(signatureParams)
    .sort()
    .map((key) => `${key}=${signatureParams[key]}`)
    .join("&");
  const signature = createHash("sha1").update(`${toSign}${apiSecret}`).digest("hex");

  return {
    provider: "cloudinary" as const,
    uploadUrl: `https://api.cloudinary.com/v1_1/${cloud}/${resourceType}/upload`,
    fields: {
      api_key: apiKey,
      timestamp: String(timestamp),
      folder,
      signature,
    },
    // The final URL is derived from the returned public_id by the client.
    fileName: name,
    kind,
  };
}

/** Firebase Storage fallback: a v4 signed PUT URL. */
async function storageTicket({
  uid,
  name,
  contentType,
  kind,
}: {
  uid: string;
  name: string;
  contentType: string;
  kind: string;
}) {
  const bucket = await getAdminBucket().catch(() => {
    throw new ApiError(
      "File uploads aren't configured yet. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET.",
      503,
    );
  });
  const path = `message-attachments/${uid}/${Date.now()}-${name}`;
  const [uploadUrl] = await bucket.file(path).getSignedUrl({
    version: "v4",
    action: "write",
    expires: Date.now() + 10 * 60 * 1000,
    contentType,
  });
  const [url] = await bucket.file(path).getSignedUrl({
    version: "v4",
    action: "read",
    expires: Date.now() + 365 * 24 * 60 * 60 * 1000,
  });

  return { provider: "storage" as const, uploadUrl, url, path, kind };
}
