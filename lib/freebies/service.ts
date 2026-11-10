import "server-only";

import { randomBytes } from "node:crypto";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getProduct } from "@/lib/channel3/products";
import { ApiError, getAdminDb, type AuthUser } from "@/lib/firebase/admin";
import {
  CAMPAIGN_DAYS,
  REFERRAL_TARGET,
  type CampaignProduct,
  type CampaignStatus,
  type FreebieOrder,
  type PublicCampaign,
} from "./types";

/**
 * All freebie logic lives here and runs ONLY on the server.
 * Firestore rules deny every client read/write on these collections, so the
 * rules below cannot be bypassed by calling the REST API directly.
 */

const CAMPAIGNS = "freebieCampaigns";
const REFERRALS = "freebieReferrals";
const ORDERS = "freebieOrders";

function db() {
  return getAdminDb();
}

function makeCode() {
  return randomBytes(9).toString("base64url");
}

function statusOf(data: FirebaseFirestore.DocumentData): CampaignStatus {
  const status = data.status as CampaignStatus;
  if (status === "active" && (data.expiresAt as Timestamp).toMillis() <= Date.now()) {
    return "expired";
  }
  return status;
}

function toPublic(
  id: string,
  data: FirebaseFirestore.DocumentData,
  viewerUid: string,
  alreadyReferred: boolean,
): PublicCampaign {
  return {
    id,
    code: data.code as string,
    product: data.product as CampaignProduct,
    target: data.target as number,
    referralCount: data.referralCount as number,
    status: statusOf(data),
    expiresAt: (data.expiresAt as Timestamp).toDate().toISOString(),
    isOwner: data.ownerUid === viewerUid,
    alreadyReferred,
    isSelf: data.ownerUid === viewerUid,
  };
}

/** Confirms the product exists and is purchasable right now. */
async function loadPurchasableProduct(productId: string): Promise<CampaignProduct> {
  let product;
  try {
    product = await getProduct(productId);
  } catch {
    throw new ApiError("We couldn't find that product.", 404);
  }

  const inStock = product.offers?.some((offer) => offer.availability === "InStock");
  if (!inStock) {
    throw new ApiError("This product is out of stock right now.", 409);
  }

  const offer = product.offers?.find((o) => o.availability === "InStock") ?? product.offers?.[0];

  return {
    productId: product.id,
    title: product.title,
    image: product.images?.[0]?.url,
    brand: product.brands?.[0]?.name,
    price: offer?.price?.price ?? 0,
    currency: offer?.price?.currency ?? "USD",
    url: offer?.url,
  };
}

/**
 * Starts (or returns the existing active) campaign for one product.
 * One campaign per user per product — enforced by a deterministic doc id.
 */
export async function startCampaign(user: AuthUser, productId: string): Promise<PublicCampaign> {
  if (!productId?.trim()) throw new ApiError("A product is required.", 400);

  const product = await loadPurchasableProduct(productId);
  const id = `${user.uid}__${productId}`;
  const ref = db().collection(CAMPAIGNS).doc(id);
  const existing = await ref.get();

  if (existing.exists) {
    const data = existing.data()!;
    const status = statusOf(data);
    if (status === "active") {
      return toPublic(id, data, user.uid, false);
    }
    if (status === "completed") {
      throw new ApiError("You already unlocked this product for free.", 409);
    }
    // Expired/cancelled → restart with a fresh window and code.
    await ref.set({
      ...data,
      code: makeCode(),
      status: "active",
      referralCount: 0,
      expiresAt: Timestamp.fromMillis(Date.now() + CAMPAIGN_DAYS * 86_400_000),
      startedAt: FieldValue.serverTimestamp(),
    });
    const restarted = await ref.get();
    return toPublic(id, restarted.data()!, user.uid, false);
  }

  const data = {
    ownerUid: user.uid,
    ownerEmail: user.email ?? null,
    productId,
    product,
    code: makeCode(),
    target: REFERRAL_TARGET,
    referralCount: 0,
    status: "active" as CampaignStatus,
    createdAt: FieldValue.serverTimestamp(),
    startedAt: FieldValue.serverTimestamp(),
    expiresAt: Timestamp.fromMillis(Date.now() + CAMPAIGN_DAYS * 86_400_000),
  };

  await ref.set(data);
  return toPublic(id, data, user.uid, false);
}

/** Campaigns owned by the signed-in user, keyed by productId. */
export async function listMyCampaigns(user: AuthUser): Promise<PublicCampaign[]> {
  const snap = await db().collection(CAMPAIGNS).where("ownerUid", "==", user.uid).get();
  return snap.docs.map((doc) => toPublic(doc.id, doc.data(), user.uid, false));
}

/**
 * Public campaign view for a share link.
 *
 * Deliberately does NOT require a signed-in viewer: the whole point of a
 * referral link is that a stranger opens it before they have an account.
 * Only non-sensitive fields are exposed (no owner uid, no emails).
 */
export async function getCampaignByCode(
  code: string,
  viewerUid?: string,
): Promise<PublicCampaign> {
  const snap = await db().collection(CAMPAIGNS).where("code", "==", code).limit(1).get();
  if (snap.empty) throw new ApiError("This referral link is not valid.", 404);

  const doc = snap.docs[0];
  const referred = viewerUid
    ? await db().collection(REFERRALS).doc(`${doc.id}__${viewerUid}`).get()
    : null;

  return toPublic(doc.id, doc.data(), viewerUid ?? "", referred?.exists ?? false);
}

/**
 * Counts one referral. Every anti-fraud rule is checked here, inside a
 * transaction, so concurrent requests cannot double-count.
 */
export async function claimReferral(
  user: AuthUser,
  code: string,
): Promise<{ campaign: PublicCampaign; counted: boolean; reason?: string }> {
  const found = await db().collection(CAMPAIGNS).where("code", "==", code).limit(1).get();
  if (found.empty) throw new ApiError("This referral link is not valid.", 404);

  const campaignRef = found.docs[0].ref;
  const referralRef = db().collection(REFERRALS).doc(`${campaignRef.id}__${user.uid}`);

  return db().runTransaction(async (tx) => {
    const [campaignSnap, referralSnap] = await Promise.all([
      tx.get(campaignRef),
      tx.get(referralRef),
    ]);

    if (!campaignSnap.exists) throw new ApiError("This referral link is not valid.", 404);
    const data = campaignSnap.data()!;

    // 1. Cannot refer yourself.
    if (data.ownerUid === user.uid) {
      throw new ApiError("You can't use your own referral link.", 403);
    }

    // 2. One referral counts once, ever.
    if (referralSnap.exists) {
      return {
        campaign: toPublic(campaignRef.id, data, user.uid, true),
        counted: false,
        reason: "You've already helped with this one.",
      };
    }

    // 3. Campaign must still be open.
    const status = statusOf(data);
    if (status !== "active") {
      throw new ApiError(
        status === "completed"
          ? "This product has already been unlocked."
          : "This referral campaign has expired.",
        409,
      );
    }

    // 4. Verified email required. (No account-age gate: brand-new accounts
    //    count immediately — the one-referral-per-account rule below is what
    //    prevents the same person from counting twice.)
    if (!user.email || !user.emailVerified) {
      throw new ApiError("Verify your email address before referring.", 403);
    }

    const nextCount = (data.referralCount as number) + 1;
    const completed = nextCount >= (data.target as number);

    tx.set(referralRef, {
      campaignId: campaignRef.id,
      ownerUid: data.ownerUid,
      referrerUid: user.uid,
      referrerEmail: user.email,
      createdAt: FieldValue.serverTimestamp(),
    });

    tx.update(campaignRef, {
      referralCount: nextCount,
      status: completed ? "completed" : "active",
      ...(completed ? { completedAt: FieldValue.serverTimestamp() } : {}),
    });

    return {
      campaign: toPublic(
        campaignRef.id,
        { ...data, referralCount: nextCount, status: completed ? "completed" : "active" },
        user.uid,
        true,
      ),
      counted: true,
    };
  });
}

/**
 * Growth loop: after helping someone, the helper can start their own campaign
 * for the SAME product. Reuses startCampaign, so all the same rules apply
 * (one campaign per user per product, stock check, expiry).
 */
export async function startCampaignFromCode(
  user: AuthUser,
  code: string,
): Promise<PublicCampaign> {
  const found = await db().collection(CAMPAIGNS).where("code", "==", code).limit(1).get();
  if (found.empty) throw new ApiError("This referral link is not valid.", 404);

  const productId = found.docs[0].data().productId as string;
  return startCampaign(user, productId);
}

/** Places the free order. Only the owner, only when completed, only once. */
export async function placeFreebieOrder(user: AuthUser, campaignId: string): Promise<FreebieOrder> {
  const campaignRef = db().collection(CAMPAIGNS).doc(campaignId);

  return db().runTransaction(async (tx) => {
    const snap = await tx.get(campaignRef);
    if (!snap.exists) throw new ApiError("Campaign not found.", 404);

    const data = snap.data()!;
    if (data.ownerUid !== user.uid) throw new ApiError("This isn't your campaign.", 403);
    if (statusOf(data) !== "completed") {
      throw new ApiError("This product isn't unlocked yet.", 409);
    }
    if (data.orderId) throw new ApiError("This free order was already placed.", 409);

    // Re-check stock at order time.
    const product = await loadPurchasableProduct(data.productId as string);

    const orderRef = db().collection(ORDERS).doc();
    const order = {
      ownerUid: user.uid,
      campaignId,
      product,
      total: 0,
      currency: product.currency,
      status: "confirmed" as const,
      createdAt: FieldValue.serverTimestamp(),
    };

    tx.set(orderRef, order);
    tx.update(campaignRef, { orderId: orderRef.id, orderedAt: FieldValue.serverTimestamp() });

    return {
      id: orderRef.id,
      campaignId,
      product,
      total: 0,
      currency: product.currency,
      status: "confirmed",
      createdAt: new Date().toISOString(),
    };
  });
}

export async function listMyOrders(user: AuthUser): Promise<FreebieOrder[]> {
  const snap = await db().collection(ORDERS).where("ownerUid", "==", user.uid).get();
  return snap.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      campaignId: data.campaignId as string,
      product: data.product as CampaignProduct,
      total: data.total as number,
      currency: data.currency as string,
      status: "confirmed" as const,
      createdAt: (data.createdAt as Timestamp).toDate().toISOString(),
    };
  });
}
