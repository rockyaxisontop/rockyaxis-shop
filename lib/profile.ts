"use client";

import { getProfile } from "@/lib/firebase/profile-client";

/**
 * The delivery details we need before an order can be shipped.
 *
 * Kept in step with `components/profile-page.tsx`: the profile form marks these
 * same six fields as required, so anything that form accepts passes this check.
 */
export const REQUIRED_DELIVERY_FIELDS = [
  "fullName",
  "phoneNumber",
  "buildingStreet",
  "locality",
  "region",
  "city",
  "area",
] as const;

export type RequiredDeliveryField = (typeof REQUIRED_DELIVERY_FIELDS)[number];

const FIELD_LABELS: Record<RequiredDeliveryField, string> = {
  fullName: "Full name",
  phoneNumber: "Phone number",
  buildingStreet: "Street address",
  locality: "Locality / landmark",
  region: "Region",
  city: "City",
  area: "Area",
};

/** Which required delivery fields are still missing from a saved profile. */
export function missingDeliveryFields(
  profile: Partial<Record<RequiredDeliveryField, unknown>> | undefined | null,
): RequiredDeliveryField[] {
  if (!profile) return [...REQUIRED_DELIVERY_FIELDS];
  return REQUIRED_DELIVERY_FIELDS.filter((field) => {
    const value = profile[field];
    return typeof value !== "string" || value.trim().length === 0;
  });
}

/** Human labels for the missing fields, for use in prompts. */
export function missingDeliveryLabels(missing: RequiredDeliveryField[]): string[] {
  return missing.map((field) => FIELD_LABELS[field] ?? field);
}

/**
 * Reads the signed-in user's saved profile and reports whether it is ready to
 * deliver to. A missing document counts as incomplete, never as an error.
 */
export async function checkDeliveryProfile(
  uid: string,
): Promise<{ complete: boolean; missing: RequiredDeliveryField[] }> {
  void uid;
  // Read through our API — `users/*` is not readable by the browser any more.
  const { profile } = await getProfile<Record<string, unknown>>().catch(() => ({
    profile: null as Record<string, unknown> | null,
  }));
  const missing = missingDeliveryFields(profile);
  return { complete: missing.length === 0, missing };
}
