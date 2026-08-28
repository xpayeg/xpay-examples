"use client";

/**
 * Deferred Elements — the reference integration.
 *
 * The Payment Element mounts from an amount alone. No checkout session exists
 * while the customer edits the cart; your server creates the session at pay
 * time with the final total, and the browser confirms with its clientSecret.
 *
 * The contract that makes this safe: the customer pays exactly the amount the
 * element displayed. If the session created at pay time has any other total,
 * the confirmation fails with `amount_reconfirmation_required` and nothing is
 * charged.
 *
 * The order of operations in handlePay is the whole pattern:
 *   1. elements.submit()             — validate the form BEFORE creating anything
 *   2. obtain THE session            — create once; on retry reuse it, updating
 *                                      its line items first if the cart changed
 *   3. xpay.confirmPayment({ elements, clientSecret })
 *
 * ONE session per checkout. A retry confirms with the SAME clientSecret, so
 * the whole transaction lifecycle (declines, retry history, the final charge)
 * lives on one Payment Intent. When the cart changed between attempts the
 * server updates the existing session to the new total; a new session is
 * never the answer to a retry. Create a fresh one only when the previous
 * session expired (`checkout_session_expired`).
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { PaymentElement, useElements, useXPay, XPayProvider } from "@xpayeg/react";
import { xpayPromise } from "@/components/xpay-loader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { generateRandomAppearance } from "@/lib/random-appearance";
import { products } from "@/lib/products";
import { Dices, LayoutGrid, Lock, Minus, Plus, Rows3 } from "lucide-react";

const CURRENCY = "EGP";

// The two products this demo sells. Quantities live in React state; the
// total is derived from them and IS the amount the element displays.
const CART_PRODUCT_IDS = ["prod_top", "prod_shorts"];

export default function DeferredCheckoutPage() {
  const [quantities, setQuantities] = useState<Record<string, number>>({
    prod_top: 1,
    prod_shorts: 1,
  });

  const cart = CART_PRODUCT_IDS.map((id) => products.find((p) => p.id === id)!);

  // One source of truth for the displayed amount, in piasters. The provider
  // forwards changes to the mounted element via elements.update() for us.
  const amount = useMemo(
    () => cart.reduce((sum, p) => sum + p.price * (quantities[p.id] ?? 0), 0),
    [cart, quantities],
  );

  const items = cart
    .filter((p) => (quantities[p.id] ?? 0) > 0)
    .map((p) => ({ productId: p.id, quantity: quantities[p.id]! }));

  if (amount <= 0) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 py-20 text-center">
        <p className="mb-6 text-sm text-muted-foreground">Your cart is empty.</p>
        <Button onClick={() => setQuantities({ prod_top: 1, prod_shorts: 1 })}>
          Refill cart
        </Button>
      </div>
    );
  }

  return (
    // Deferred options: mode + amount + currency, no clientSecret. Changing
    // `amount` here updates the mounted element in place.
    <XPayProvider xpay={xpayPromise} options={{ mode: "payment", amount, currency: CURRENCY }}>
      <DeferredCheckoutForm
        amount={amount}
        items={items}
        quantities={quantities}
        setQuantities={setQuantities}
      />
    </XPayProvider>
  );
}

function DeferredCheckoutForm({
  amount,
  items,
  quantities,
  setQuantities,
}: {
  amount: number;
  items: { productId: string; quantity: number }[];
  quantities: Record<string, number>;
  setQuantities: (q: Record<string, number>) => void;
}) {
  const router = useRouter();
  const xpay = useXPay();
  // Deferred integrations use useElements() + <PaymentElement />.
  // useCheckout() is for session-first integrations; there is no session here.
  const elements = useElements();
  const { resolvedTheme } = useTheme();

  const [email, setEmail] = useState("customer@example.com");
  const [name, setName] = useState("Ahmed Hassan");
  const [paymentReady, setPaymentReady] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  // Payment Element layout: "tabs" renders the methods as a wrapping tile
  // grid, "accordion" (the default) as a vertical list. The toggle below
  // shows that layout can change after the element is mounted.
  const [layout, setLayout] = useState<"tabs" | "accordion">("tabs");

  // A randomized palette pins explicit color hexes, and `changeAppearance`
  // MERGES rather than replaces, so flipping only `colorMode` afterwards
  // would leave the old theme's hexes in place. A ref, not state: the theme
  // effect below must react to the theme changing, never to this flipping
  // (that would re-randomize the palette we just applied).
  const randomizedRef = useRef(false);

  const handleRandomize = () => {
    const appearance = generateRandomAppearance(resolvedTheme === "dark");
    randomizedRef.current = true;
    elements?.changeAppearance(appearance);
  };

  /**
   * The one session this checkout owns, plus the amount it is priced at.
   * Created on the first Pay click, then REUSED: unchanged cart confirms it
   * as-is; a changed cart updates it to the new total first. Dropped only
   * when the session itself dies (expired), never on a payment failure.
   */
  const checkoutSessionRef = useRef<{ id: string; clientSecret: string; amount: number } | null>(
    null,
  );

  // Keep the element's theme in sync with the site's theme toggle. With a
  // randomized palette active, regenerate it for the new theme: sending
  // `colorMode` alone would keep the old theme's hexes (see randomizedRef).
  useEffect(() => {
    const isDark = resolvedTheme === "dark";
    elements?.changeAppearance(
      randomizedRef.current
        ? generateRandomAppearance(isDark)
        : { colorMode: isDark ? "dark" : "light" },
    );
  }, [resolvedTheme, elements]);

  const setQuantity = (productId: string, quantity: number) => {
    // Never move the amount mid-confirmation: the session being created right
    // now was priced from the current total.
    if (confirming) return;
    setQuantities({ ...quantities, [productId]: Math.max(0, quantity) });
  };

  const handlePay = async () => {
    if (!xpay || !elements) return;
    setError("");
    setConfirming(true);

    try {
      // 1. Validate the payment form BEFORE creating anything server-side.
      //    An incomplete card number should never cost you an orphan session.
      const submission = await elements.submit();
      if (submission.error) {
        setError(submission.error.message);
        return;
      }

      // 2. Obtain THE session for this checkout. First attempt creates it,
      //    priced from the same cart state the element is displaying. A retry
      //    reuses it: unchanged cart confirms as-is; a changed cart updates
      //    the existing session to the new total. Same session, same Payment
      //    Intent, full transaction lifecycle.
      let session = checkoutSessionRef.current;
      if (!session) {
        const res = await fetch("/api/create-deferred-checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items }),
        });
        const data = (await res.json()) as {
          id?: string;
          clientSecret?: string;
          error?: string;
        };
        if (!res.ok || !data.clientSecret || !data.id) {
          setError(data.error ?? "Could not start the payment.");
          return; // never confirm without a valid clientSecret
        }
        session = { id: data.id, clientSecret: data.clientSecret, amount };
        checkoutSessionRef.current = session;
      } else if (session.amount !== amount) {
        const res = await fetch("/api/update-deferred-checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: session.id, items }),
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) {
          setError(data.error ?? "Could not update the checkout session.");
          return;
        }
        session = { ...session, amount };
        checkoutSessionRef.current = session;
      }

      // 3. Confirm with the session's clientSecret. A plain string, no
      //    callback. On a retry this is the SAME secret as the last attempt.
      const result = await xpay.confirmPayment({
        elements,
        clientSecret: session.clientSecret,
        customerDetails: { email, name },
        redirect: "if_required",
      });

      if (result.type === "error") {
        // The session itself died (expired). Drop it so the next attempt
        // creates a fresh one; every other failure keeps the session for
        // retry on the same Payment Intent.
        if (result.error.code === "checkout_session_expired") {
          checkoutSessionRef.current = null;
          setError("The checkout session expired. Click Pay to start a fresh one.");
          return;
        }
        // The one deferred-specific failure: the session's total differs from
        // the amount the element displayed. Nothing was charged. On this page
        // both numbers derive from the same cart state, so hitting this means
        // a pricing bug server-side; surface it loudly instead of retrying.
        if (result.error.code === "amount_reconfirmation_required") {
          setError(
            "The server-side total no longer matches the displayed amount. Nothing was charged. Refresh the page and try again.",
          );
          return;
        }
        setError(result.error.message);
        return;
      }

      router.push(`/success?session_id=${result.session.id}`);
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <h1 className="mb-1 text-2xl font-medium tracking-tight">Deferred checkout</h1>
      <p className="mb-8 text-sm text-muted-foreground">
        The payment form is live before any session exists. The session is created when you pay,
        with exactly the total shown on the button.
      </p>

      {/* Cart — editing it updates the element's displayed amount live */}
      <div className="mb-8 divide-y divide-border/60 border-y border-border/60">
        {CART_PRODUCT_IDS.map((id) => {
          const product = products.find((p) => p.id === id)!;
          const quantity = quantities[id] ?? 0;
          return (
            <div key={id} className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium">{product.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(product.price / 100).toFixed(2)} {CURRENCY}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  disabled={confirming || quantity === 0}
                  onClick={() => setQuantity(id, quantity - 1)}
                  aria-label={`Decrease ${product.name} quantity`}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="w-4 text-center text-sm tabular-nums">{quantity}</span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  disabled={confirming}
                  onClick={() => setQuantity(id, quantity + 1)}
                  aria-label={`Increase ${product.name} quantity`}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Your form owns contact details in uiMode: "custom" */}
      <div className="mb-6 grid gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={confirming}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={confirming}
          />
        </div>
      </div>

      {/* The one piece you don't build */}
      <div className="mb-6">
        <PaymentElement
          options={{ layout }}
          onChange={(event) => setPaymentReady(event.complete)}
          onLoadError={(err) => setError(err.message)}
        />
      </div>

      {error && (
        <p role="alert" className="mb-4 text-sm text-destructive">
          {error}
        </p>
      )}

      <Button
        className="w-full"
        disabled={!paymentReady || confirming || !xpay || !elements}
        onClick={handlePay}
      >
        <Lock className="mr-2 h-3.5 w-3.5" />
        {confirming ? "Processing…" : `Pay ${(amount / 100).toFixed(2)} ${CURRENCY}`}
      </Button>

      <p className="mt-3 text-center text-xs text-muted-foreground">
        No session exists until you click Pay. You are charged exactly the amount on the button, or
        nothing.
      </p>

      {/* Demo controls: both call into the mounted element at runtime. */}
      <div className="fixed bottom-16 right-6 z-50 flex flex-col items-end gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setLayout(layout === "tabs" ? "accordion" : "tabs")}
          className="gap-1.5 rounded-full text-xs text-muted-foreground shadow-lg"
        >
          {layout === "tabs" ? <LayoutGrid className="size-3.5" /> : <Rows3 className="size-3.5" />}
          Layout: {layout === "tabs" ? "Tabs" : "Accordion"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRandomize}
          className="gap-1.5 rounded-full text-xs text-muted-foreground shadow-lg"
        >
          <Dices className="size-3.5" />
          Randomize Appearance
        </Button>
      </div>
    </div>
  );
}
