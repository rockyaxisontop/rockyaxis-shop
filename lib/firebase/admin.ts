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

function getAdminApp() {
  const existing = getApps().find((app) => app.name === "mt-shop-admin");
  if (existing) return existing;

  const rawAccount = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT;
  if (!rawAccount) {
    throw new ApiError("Free-order services are not configured yet.", 503);
  }

  try {
    const account = JSON.parse(rawAccount) as {
      project_id?: string;
      client_email?: string;
      private_key?: string;
    };
    if (!account.project_id || !account.client_email || !account.private_key) {
      throw new Error("Service account is missing required fields");
    }
    return initializeApp(
      {
        credential: cert({
          projectId: account.project_id,
          clientEmail: account.client_email,
          privateKey: account.private_key.replace(/\\n/g, "\n"),
        }),
      },
      "mt-shop-admin",
    );
  } catch {
    throw new ApiError("Firebase Admin configuration is invalid.", 503);
  }
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
  return NextResponse.json({ error: "The request could not be completed." }, { status: 500 });
}