import { NextResponse } from "next/server";
import { createCheckoutSession } from "@/lib/api";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      uiMode = "custom",
      items = [],
      allowPromotionCodes = false,
    } = body as {
      uiMode?: "hosted" | "embedded" | "custom";
      items?: { productId: string; quantity: number; customAmount?: number }[];
      allowPromotionCodes?: boolean;
    };

    if (!items.length) {
      return NextResponse.json(
        { error: "At least one item is required" },
        { status: 400 },
      );
    }

    const session = await createCheckoutSession({
      uiMode,
      items,
      allowPromotionCodes,
    });

    return NextResponse.json(session);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create checkout session";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
