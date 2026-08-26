import { NextResponse } from "next/server";
import { createDeferredCheckoutSession } from "@/lib/api";

/**
 * Deferred Elements: create THE checkout session at pay time, priced from the
 * server's own catalog at the current cart state. Called once per checkout —
 * retries reuse the same session (see /api/update-deferred-checkout).
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { items = [] } = body as {
      items?: { productId: string; quantity: number }[];
    };

    if (!items.length) {
      return NextResponse.json(
        { error: "At least one item is required" },
        { status: 400 },
      );
    }

    const session = await createDeferredCheckoutSession(items);

    return NextResponse.json({ id: session.id, clientSecret: session.clientSecret });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create checkout session";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
