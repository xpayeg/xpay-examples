import crypto from "node:crypto";
import { NextResponse } from "next/server";

/**
 * XPay webhook receiver — confirms payments and triggers fulfillment.
 *
 * Fulfil when the session's `paymentStatus` is "paid", never on an event name
 * alone. Cards pay inside checkout, so `checkout.session.completed` arrives
 * already paid. Methods the customer pays afterwards (Fawry) complete the
 * session as "unpaid" and the money is announced later by
 * `checkout.session.async_payment_succeeded` (or never, by
 * `checkout.session.async_payment_failed`). Don't rely on the success page
 * either way — the customer can close their tab and never load it.
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

  // Event envelope shape: every XPay webhook has the resource nested under
  // `data.object`. For checkout.session.* events the inner object is the
  // CheckoutSession with `id`, `status`, etc.
  const event = result.event as {
    id: string;
    type: string;
    data?: { object?: { id?: string; paymentStatus?: string; [key: string]: unknown } };
  };
  const session = event.data?.object;

  // Retries can deliver the same event more than once — dedup on `event.id`
  // before doing real work. See the Idempotency section of the guide above.

  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
      // ONE fulfilment path for both events, gated on paymentStatus. A card
      // payment arrives as `completed` with "paid". A Fawry payment arrives
      // as `completed` with "unpaid" (record the order as awaiting payment,
      // ship nothing yet) and again as `async_payment_succeeded` with "paid"
      // once the customer pays the reference.
      if (session?.paymentStatus === "paid") {
        // Payment confirmed — fulfill the order here. Make it safe to run
        // twice for the same session: deliveries are retried.
        // e.g. await markOrderPaid(session.id) and send the receipt email.
        console.log("[webhook] paid:", event.type, session?.id);
      } else {
        // Awaiting an out-of-band payment (a Fawry reference). Do not fulfil.
        console.log("[webhook] awaiting payment:", session?.id);
      }
      break;

    case "checkout.session.async_payment_failed":
      // The reference expired unpaid or the payment was declined at the
      // kiosk. The money is not coming — close the order.
      console.log("[webhook] async payment failed:", session?.id);
      break;

    case "checkout.session.expired":
      // Customer didn't pay in time — release any held stock.
      console.log("[webhook] checkout.session.expired:", session?.id);
      break;

    default:
      console.log("[webhook] unhandled event type:", event.type, session);
  }

  return new NextResponse(null, { status: 200 });
}
