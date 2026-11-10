import "server-only";

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth, type UserRecord } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { NextResponse } from "next/server";

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

type ServiceAccount = { projectId: string; clientEmail: string; privateKey: string };

/**
 * Accepts either shape, because both are common in the wild:
 *   1. the full service-account JSON downloaded from the Firebase console
 *   2. just the PEM private key, with project id / client email supplied
 *      separately (FIREBASE_ADMIN_PROJECT_ID / FIREBASE_ADMIN_CLIENT_EMAIL)
 *
 * A bare PEM key used to be parsed as JSON, fail, and surface as a generic
 * 500 — so the error message now says exactly which piece is missing.
 */
function readServiceAccount(): ServiceAccount {
  const raw = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT?.trim();
  if (!raw) {
    throw new ApiError("Firebase Admin credentials are missing (FIREBASE_ADMIN_SERVICE_ACCOUNT).", 503);
  }

  // Strip optional surrounding quotes pasted from a shell.
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
      throw new ApiError(
        "FIREBASE_ADMIN_SERVICE_ACCOUNT JSON is missing project_id, client_email or private_key.",
        503,
      );
    }
    return {
      projectId: account.project_id,
      clientEmail: account.client_email,
      privateKey: normalizeKey(account.private_key),
    };
  }

  // Bare PEM key path.
  if (!value.includes("BEGIN PRIVATE KEY")) {
    throw new ApiError(
      "FIREBASE_ADMIN_SERVICE_ACCOUNT must be the service-account JSON or a PEM private key.",
      503,
    );
  }

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  if (!projectId || !clientEmail) {
    throw new ApiError(
      "A bare private key needs FIREBASE_ADMIN_PROJECT_ID and FIREBASE_ADMIN_CLIENT_EMAIL as well.",
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

export async function requireVerifiedUser(request: Request): Promise<UserRecord> {
  const authorization = request.headers.get("authorization");
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) throw new ApiError("Sign in to continue.", 401);

  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    const user = await getAdminAuth().getUser(decoded.uid);
    if (!user.email || !user.emailVerified) {
      throw new ApiError("Verify your email address before continuing.", 403);
    }
    return user;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError("Your session is invalid. Sign in again.", 401);
  }
}

export function apiErrorResponse(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error("Unexpected trusted API error:", error);
  return NextResponse.json({ error: "The request could not be completed." }, { status: 500 });
}