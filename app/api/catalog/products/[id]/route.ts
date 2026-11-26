import { NextResponse } from "next/server";

import { getProduct } from "@/lib/products/service";

/**
 * Single product lookup:
 *   POST /api/catalog/products/:id
 *
 * Products are stored when first discovered, so this is a Firestore read. The
 * body (if any) is ignored: eBay listings have no variant matrix to resolve.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const product = await getProduct(id);
    return NextResponse.json(product);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Couldn't load that product";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}

/** GET support for the client-side variant resolver. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    return NextResponse.json(await getProduct(id));
  } catch {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }
}
