
import "server-only";

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { NextResponse } from "next/server";

import { verifyFirebaseIdToken } from "./verify-token";

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
 * Reads the service account from, in order:
 *   1. FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON  (full JSON, one line)
 *   2. FIREBASE_ADMIN_SERVICE_ACCOUNT       (JSON or PEM)
 *   3. a file at FIREBASE_ADMIN_SERVICE_ACCOUNT_FILE
 *
 * Why the extra names: Next.js redacts values it considers secret-looking and
 * substitutes the literal string "[SENSITIVE]" in production builds, which
 * silently breaks the Admin SDK. The *_JSON name avoids that heuristic, and
 * the file option sidesteps env handling entirely.
 */
function readRawCredential(): string {
  const candidates = [
    process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON,
    process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT,
  ];

  for (const candidate of candidates) {
    const value = candidate?.trim();
    if (value && value !== "[SENSITIVE]") return value;
  }

  const filePath = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_FILE;
  if (filePath) {
    const resolved = filePath.startsWith("/") ? filePath : join(process.cwd(), filePath);
    if (existsSync(resolved)) return readFileSync(resolved, "utf8");
  }

  throw new ApiError(
    "Firebase Admin credentials are missing or were redacted by the build. Set FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON.",
    503,
  );
}

function readServiceAccount(): ServiceAccount {
  let value = readRawCredential().trim();

  // Strip surrounding quotes pasted from a shell or dashboard.
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1).trim();
  }

  const normalizeKey = (key: string) =>
    key.replace(/\\r\\n/g, "\n").replace(/\\n/g, "\n").replace(/\r\n/g, "\n").trim();

  if (value.startsWith("{")) {
    let account: { project_id?: string; client_email?: string; private_key?: string };
    try {
      account = JSON.parse(value);
    } catch {
      throw new ApiError("Service account JSON could not be parsed.", 503);
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
    throw new ApiError(
      `Service account must be JSON or a PEM key (got ${value.length} chars).`,
      503,
    );
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

export function getAdminDb() {
  return getFirestore(getAdminApp());
}

/** The authenticated caller, derived from a verified Firebase ID token. */
export type AuthUser = {
  uid: string;
  email?: string;
  emailVerified: boolean;
  /** Milliseconds since epoch, from the token's `auth_time`/`iat`. */
  createdAt: number;
};

/**
 * Verifies the caller's Firebase ID token. Throws 401 when missing/invalid.
 *
 * Uses `jose` directly instead of `firebase-admin/auth` — see verify-token.ts
 * for why (jwks-rsa requires an ESM-only module and breaks on Vercel).
 */
export async function requireUser(request: Request): Promise<AuthUser> {
  const header = request.headers.get("authorization");
  const token = header?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) throw new ApiError("Sign in to continue.", 401);

  try {
    const payload = await verifyFirebaseIdToken(token);
    const iat = typeof payload.iat === "number" ? payload.iat * 1000 : Date.now();
    return {
      uid: payload.uid,
      email: payload.email,
      emailVerified: payload.email_verified === true,
      createdAt: iat,
    };
  } catch {
    throw new ApiError("Your session is invalid. Sign in again.", 401);
  }
}

/** Like requireUser, but returns null instead of throwing when signed out. */
export async function optionalUser(request: Request): Promise<AuthUser | null> {
  const header = request.headers.get("authorization");
  const token = header?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return null;

  try {
    const payload = await verifyFirebaseIdToken(token);
    const iat = typeof payload.iat === "number" ? payload.iat * 1000 : Date.now();
    return {
      uid: payload.uid,
      email: payload.email,
      emailVerified: payload.email_verified === true,
      createdAt: iat,
    };
  } catch {
    return null;
  }
}

export function apiErrorResponse(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error("Unexpected API error:", error);
  return NextResponse.json({ error: "The request could not be completed." }, { status: 500 });
}
