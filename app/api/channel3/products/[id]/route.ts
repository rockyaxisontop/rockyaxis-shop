import { NextResponse } from "next/server";

import { getProduct } from "@/lib/channel3/products";

/**
 * Variant re-resolution for `useVariantSelection`:
 *   POST /api/channel3/products/:id { selected_options: { Color: "Black" } }
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const body = (await request.json().catch(() => ({}))) as {
    selected_options?: Record<string, string>;
  };

  try {
    const product = await getProduct(id, { selected_options: body.selected_options });
    return NextResponse.json(product);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Couldn't load that variant";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
