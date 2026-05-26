import { NextResponse } from "next/server";
import { getCheckoutSession } from "@/lib/api";

/**
 * Read-only lookup used by the success page to render the receipt.
 * Order fulfillment happens in `/api/webhooks` off `checkout.session.completed`,
 * not here — the customer may close the tab before this page loads.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("session_id");

  if (!sessionId) {
    return NextResponse.json(
      { error: "session_id is required" },
      { status: 400 },
    );
  }

  try {
    const session = await getCheckoutSession(sessionId);
    return NextResponse.json(session);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch session";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
