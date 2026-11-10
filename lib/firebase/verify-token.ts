import "server-only";

import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";

/**
 * Verifies a Firebase ID token WITHOUT firebase-admin/auth.
 *
 * Why: `firebase-admin/auth` pulls in `jwks-rsa`, which does
 * `require('jose')` — and jose v6 is ESM-only. That works in `next dev` but
 * throws `ERR_REQUIRE_ESM` inside Vercel's bundled CommonJS runtime.
 *
 * Verifying against Google's public JWKS with `jose` directly is the same
 * cryptographic check Firebase performs, with no CJS/ESM conflict.
 */

const PROJECT_ID =
  process.env.FIREBASE_ADMIN_PROJECT_ID ??
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ??
  "rockyaxis-shop";

const JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"),
);

export type VerifiedToken = JWTPayload & {
  uid: string;
  email?: string;
  email_verified?: boolean;
};

export async function verifyFirebaseIdToken(idToken: string): Promise<VerifiedToken> {
  const { payload } = await jwtVerify(idToken, JWKS, {
    issuer: `https://securetoken.google.com/${PROJECT_ID}`,
    audience: PROJECT_ID,
    algorithms: ["RS256"],
  });

  const uid = typeof payload.sub === "string" ? payload.sub : "";
  if (!uid) throw new Error("Token has no subject");

  return {
    ...payload,
    uid,
    email: typeof payload.email === "string" ? payload.email : undefined,
    email_verified: payload.email_verified === true,
  };
}
