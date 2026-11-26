import { NextResponse } from "next/server";

import { getSimilarProducts } from "@/lib/products/service";

/** Similar products for the PDP carousel: GET /api/catalog/products/:id/similar?limit=12 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const limit = Math.min(Number(new URL(request.url).searchParams.get("limit")) || 12, 30);

  try {
    const products = await getSimilarProducts(id, limit);
    return NextResponse.json({ products }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Couldn't load similar products";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
