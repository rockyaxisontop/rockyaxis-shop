import "server-only";

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth, type UserRecord } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { NextResponse } from "next/server";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type ServiceAccount = { projectId: string; clientEmail: string; privateKey: string };

/**
 * Accepts either the full service-account JSON or a bare PEM private key
 * (with FIREBASE_ADMIN_PROJECT_ID / FIREBASE_ADMIN_CLIENT_EMAIL alongside).
 */
function readServiceAccount(): ServiceAccount {
  const raw = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT?.trim();
  if (!raw) {
    throw new ApiError("Firebase Admin credentials are missing.", 503);
  }

  const value = raw.replace(/^['"]|['"]$/g, "");
  const normalizeKey = (key: string) => key.replace(/\\n/g, "\n");

  if (value.startsWith("{")) {
    let account: { project_id?: string; client_email?: string; private_key?: string };
    try {
      account = JSON.parse(value);
    } catch {
      throw new ApiError("FIREBASE_ADMIN_SERVICE_ACCOUNT is not valid JSON.", 503);
    }
    if (!account.project_id || !account.client_email || !account.private_key) {
      throw new ApiError("Service account JSON is missing required fields.", 503);
    }
    return {
      projectId: account.project_id,
      clientEmail: account.client_email,
      privateKey: normalizeKey(account.private_key),
    };
  }

  if (!value.includes("BEGIN PRIVATE KEY")) {
    throw new ApiError("FIREBASE_ADMIN_SERVICE_ACCOUNT must be JSON or a PEM key.", 503);
  }

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  if (!projectId || !clientEmail) {
    throw new ApiError(
      "A bare private key needs FIREBASE_ADMIN_PROJECT_ID and FIREBASE_ADMIN_CLIENT_EMAIL.",
      503,
    );
  }

  return { projectId, clientEmail, privateKey: normalizeKey(value) };
}

function getAdminApp() {
  const existing = getApps().find((app) => app.name === "mt-shop-admin");
  if (existing) return existing;

  const account = readServiceAccount();
  return initializeApp(
    {
      credential: cert({
        projectId: account.projectId,
        clientEmail: account.clientEmail,
        privateKey: account.privateKey,
      }),
    },
    "mt-shop-admin",
  );
}

export function getAdminAuth() {
  return getAuth(getAdminApp());
}

export function getAdminDb() {
  return getFirestore(getAdminApp());
}

/** Verifies the caller's Firebase ID token. Throws 401 when missing/invalid. */
export async function requireUser(request: Request): Promise<UserRecord> {
  const header = request.headers.get("authorization");
  const token = header?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) throw new ApiError("Sign in to continue.", 401);

  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    return await getAdminAuth().getUser(decoded.uid);
  } catch {
    throw new ApiError("Your session is invalid. Sign in again.", 401);
  }
}

export function apiErrorResponse(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error("Unexpected API error:", error);
  return NextResponse.json({ error: "The request could not be completed." }, { status: 500 });
}
