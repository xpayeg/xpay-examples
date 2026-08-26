import { NextResponse } from "next/server";
import { updateDeferredCheckoutSessionItems } from "@/lib/api";

/**
 * Deferred Elements retry support: when the cart changed between attempts,
 * update the EXISTING session's line items to the new total instead of
 * creating a new session. One session per checkout keeps the whole
 * transaction lifecycle on one Payment Intent.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { sessionId, items = [] } = body as {
      sessionId?: string;
      items?: { productId: string; quantity: number }[];
    };

    if (!sessionId) {
      return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
    }
    if (!items.length) {
      return NextResponse.json(
        { error: "At least one item is required" },
        { status: 400 },
      );
    }

    // Demo shortcut: this store has no user accounts, so any visitor-supplied
    // sessionId is accepted. A production integration MUST verify the
    // sessionId belongs to the caller's own cart/order (e.g. stored in their
    // server-side session) before updating it.
    const session = await updateDeferredCheckoutSessionItems(sessionId, items);

    return NextResponse.json({ id: session.id });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update checkout session";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
