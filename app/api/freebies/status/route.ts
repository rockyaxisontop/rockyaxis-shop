import { NextResponse } from "next/server";

import { getAdminDb } from "@/lib/firebase/admin";
import { hasChannel3Key } from "@/lib/channel3/server";

export async function GET() {
  let adminReady = false;
  let adminMessage = "";
  try {
    getAdminDb();
    adminReady = true;
  } catch (error) {
    adminReady = false;
    adminMessage = error instanceof Error ? error.message : "Firebase Admin configuration is invalid.";
  }

  const catalogReady = hasChannel3Key();
  const available = adminReady && catalogReady;
  return NextResponse.json({
    available,
    message: available
      ? ""
      : adminMessage || "Product stock verification is not configured. Set CHANNEL3_API_KEY on the server.",
  });
}