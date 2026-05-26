import crypto from "node:crypto";
import { NextResponse } from "next/server";

/**
 * XPay webhook receiver — confirms payments and triggers fulfillment.
 *
 * `checkout.session.completed` is the signal that the customer paid. Don't
 * rely on the success page for this — the customer can close their tab the
 * moment their card is charged and never load it.
 *
 * Every delivery is signed. Always verify before trusting the payload,
 * otherwise anyone who knows your URL can forge a "paid" event.
 *
 * Full guide (header format, framework recipes, idempotency, retries):
 * https://docs.xpay.app/integrate/webhooks/verifying-signatures
 */

const TOLERANCE_SECONDS = 300;

function verifyXPaySignature(
  rawBody: string,
  header: string | undefined,
  secret: string,
): { valid: boolean; event?: unknown } {
  if (!header) return { valid: false };

  const parts = Object.fromEntries(
    header.split(",").map((p) => {
      const [k, ...rest] = p.split("=");
      return [k, rest.join("=")];
    }),
  );

  const timestamp = Number.parseInt(parts.t ?? "", 10);
  const received = parts.v1;
  if (!Number.isFinite(timestamp) || !received) return { valid: false };

  if (Math.abs(Math.floor(Date.now() / 1000) - timestamp) > TOLERANCE_SECONDS) {
    return { valid: false };
  }

  const computed = crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");

  const a = Buffer.from(computed);
  const b = Buffer.from(received);
  if (a.length !== b.length) return { valid: false };
  if (!crypto.timingSafeEqual(a, b)) return { valid: false };

  return { valid: true, event: JSON.parse(rawBody) };
}

export async function POST(request: Request) {
  const rawBody = await request.text(); // read once, before any .json()

  const result = verifyXPaySignature(
    rawBody,
    request.headers.get("XPay-Signature") ?? undefined,
    process.env.XPAY_WEBHOOK_SECRET!,
  );

  if (!result.valid) {
    return new NextResponse("invalid signature", { status: 400 });
  }

  const event = result.event as { id: string; type: string; data?: { id?: string } };

  // Retries can deliver the same event more than once — dedup on `event.id`
  // before doing real work. See the Idempotency section of the guide above.

  switch (event.type) {
    case "checkout.session.completed":
      // Payment confirmed — fulfill the order here.
      // e.g. await markOrderPaid(event.data.id) and send the receipt email.
      console.log("[webhook] checkout.session.completed:", event.data?.id);
      break;

    case "checkout.session.expired":
      // Customer didn't pay in time — release any held stock.
      console.log("[webhook] checkout.session.expired:", event.data?.id);
      break;

    default:
      console.log("[webhook] unhandled event type:", event.type, event.data);
  }

  return new NextResponse(null, { status: 200 });
}
