"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTheme } from "next-themes";
import { XPayProvider, useCheckout, PaymentElement, type Checkout } from "@xpayeg/react";
import { xpayPromise } from "@/components/xpay-loader";
import { OrderSummary, type OrderSummaryProps } from "@/components/order-summary";
import { PromoCodeInput } from "@/components/promo-code-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { ArrowLeft, Dices, Lock, ShieldCheck } from "lucide-react";
import { generateRandomAppearance } from "@/lib/random-appearance";

export default function CustomCheckoutPage() {
  return (
    <Suspense fallback={<CheckoutSkeleton />}>
      <CheckoutLoader />
    </Suspense>
  );
}

function CheckoutLoader() {
  const searchParams = useSearchParams();
  const clientSecret = searchParams.get("cs");

  if (!clientSecret) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 py-20 text-center">
        <p className="mb-6 text-sm text-muted-foreground">
          No checkout session. Please start from a product page.
        </p>
        <Button asChild className="rounded-md text-sm"><Link href="/">Browse Products</Link></Button>
      </div>
    );
  }

  return (
    <XPayProvider xpay={xpayPromise} options={{ clientSecret }}>
      <CheckoutGate />
    </XPayProvider>
  );
}

// ────────────────────────────────────────────────────────────
// CheckoutGate — handles loading/error/terminal states
// CheckoutForm — the actual form, only rendered when session is open
// ────────────────────────────────────────────────────────────

function CheckoutGate() {
  const checkoutState = useCheckout();
  console.log("[XPay SDK] useCheckout():", checkoutState);

  if (checkoutState.type === "loading") {
    return <CheckoutSkeleton />;
  }

  if (checkoutState.type === "error") {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 py-20 text-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <p className="text-sm text-destructive">{checkoutState.error.message}</p>
      </div>
    );
  }

  const { checkout } = checkoutState;

  if (checkout.status.type === "expired") {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 py-20 text-center">
        <h2 className="mb-3 text-2xl font-medium tracking-tight">Session Expired</h2>
        <p className="mb-6 text-sm text-muted-foreground">Please start a new checkout.</p>
        <Button asChild className="rounded-md text-sm"><Link href="/">Continue Shopping</Link></Button>
      </div>
    );
  }

  if (checkout.status.type === "complete") {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 py-20 text-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <h2 className="mb-3 text-2xl font-medium tracking-tight">Payment Complete</h2>
        <p className="mb-6 text-sm text-muted-foreground">This session has already been paid.</p>
        <Button asChild className="rounded-md text-sm"><Link href="/">Continue Shopping</Link></Button>
      </div>
    );
  }

  // Session is open — render the checkout form
  return <CheckoutForm checkout={checkoutState.checkout} />;
}

function CheckoutForm({ checkout }: { checkout: Checkout }) {
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const [confirming, setConfirming] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [email, setEmail] = useState("customer@example.com");
  const [name, setName] = useState("Ahmed Hassan");
  const [paymentReady, setPaymentReady] = useState(false);
  // Sync dark mode with XPay appearance
  useEffect(() => {
    checkout.changeAppearance({
      colorMode: resolvedTheme === "dark" ? "dark" : "light",
    });
  }, [resolvedTheme, checkout]);

  const handleRandomize = () => {
    const appearance = generateRandomAppearance(resolvedTheme === "dark");
    checkout.changeAppearance(appearance);
    console.log("[XPay SDK] Random appearance:", appearance);
  };

  // Log session data once on mount (demonstrates what's available to the merchant)
  useEffect(() => {
    console.log("[XPay SDK] Session loaded:", {
      id: checkout.id,
      status: checkout.status,
      canConfirm: checkout.canConfirm,
      currency: checkout.currency,
      amountTotal: checkout.amountTotal,
      amountSubtotal: checkout.amountSubtotal,
      merchantName: checkout.merchantName,
      livemode: checkout.livemode,
      paymentMethods: checkout.paymentMethods,
      lineItems: checkout.lineItems,
      totalDetails: checkout.totalDetails,
      fees: checkout.fees,
      discounts: checkout.discounts,
    });

    // Listen for unsolicited errors (e.g. session expired during fee recalculation, BIN detection failure)
    checkout.on("error", (error) => {
      console.log("[XPay SDK] error event:", error);
      setPaymentError(error.message);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasPromo = (checkout.discounts?.length ?? 0) > 0;
  const promoCode = checkout.discounts?.[0]?.promotionCodeCode ?? "";

  const handleConfirm = async () => {
    setPaymentError("");
    setConfirming(true);

    const result = await checkout.confirm({
      customerDetails: { email, name },
      redirect: "if_required",
    });

    console.log("[XPay SDK] confirm() result:", result);

    if (result.type === "error") {
      setPaymentError(result.error.message);
      setConfirming(false);
      return;
    }

    router.push(`/success?session_id=${checkout.id}`);
  };

  const handleApplyPromo = async (code: string) => {
    const result = await checkout.applyPromotionCode(code);
    console.log("[XPay SDK] applyPromotionCode() result:", result);
    return result;
  };

  const handleRemovePromo = async () => {
    const result = await checkout.removePromotionCode();
    console.log("[XPay SDK] removePromotionCode() result:", result);
    return result;
  };

  const handleUpdateQuantity = async (lineItemId: string, quantity: number) => {
    if (quantity < 1) return;
    const result = await checkout.updateLineItemQuantity({ lineItem: lineItemId, quantity });
    console.log("[XPay SDK] updateLineItemQuantity() result:", result);
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <div className="mb-8 flex items-center justify-between">
        <Link
          href="/"
          className="group inline-flex items-center text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="mr-1.5 h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
          Back to store
        </Link>
        <div className="flex items-center font-mono text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          <Lock className="mr-1.5 h-3 w-3" /> Secure Checkout
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-12 lg:gap-10">
        {/* Sidebar — shows first on mobile, second on desktop */}
        <div className="order-first lg:order-last lg:col-span-5 xl:col-span-4">
          <div className="sticky top-20 space-y-4">
            <div className="overflow-hidden rounded-lg border border-border/50 bg-card/50">
              <div className="border-b border-border/50 bg-muted/30 px-5 py-4">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Order Summary
                </h2>
              </div>
              <div className="p-5">
                <OrderSummary
                  currency={checkout.currency}
                  amountSubtotal={checkout.amountSubtotal}
                  amountTotal={checkout.amountTotal}
                  totalDetails={checkout.totalDetails as OrderSummaryProps["totalDetails"]}
                  lineItems={checkout.lineItems as OrderSummaryProps["lineItems"]}
                  discounts={checkout.discounts as OrderSummaryProps["discounts"]}
                  onUpdateQuantity={handleUpdateQuantity}
                />
              </div>
            </div>

            <div className="overflow-hidden rounded-lg border border-border/50 bg-card/50 p-5">
              <PromoCodeInput
                onApply={handleApplyPromo}
                onRemove={handleRemovePromo}
                hasActivePromo={hasPromo}
                activePromoCode={promoCode}
              />
            </div>
          </div>
        </div>

        {/* Payment form */}
        <div className="lg:col-span-7 xl:col-span-8">
          <div className="space-y-4">
            {/* Contact */}
            <section className="overflow-hidden rounded-lg border border-border/50 bg-card/50">
              <div className="border-b border-border/50 bg-muted/30 px-6 py-4">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Contact Information
                </h2>
              </div>
              <div className="p-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-xs text-muted-foreground">
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-10 rounded-md"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="name" className="text-xs text-muted-foreground">
                      Full Name
                    </Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="h-10 rounded-md"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Payment */}
            <section className="overflow-hidden rounded-lg border border-border/50 bg-card/50">
              <div className="flex items-center justify-between border-b border-border/50 bg-muted/30 px-6 py-4">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Payment Details
                </h2>
                <p className="text-xs text-muted-foreground">
                  {checkout.paymentMethods.map((pm) => pm.displayName).join(", ")}
                </p>
              </div>

              <div className="p-6">
                <PaymentElement
                  onLoaderStart={() => {
                    console.log("[XPay SDK] PaymentElement loaderstart");
                  }}
                  onReady={() => {
                    console.log("[XPay SDK] PaymentElement ready");
                  }}
                  onChange={(event) => {
                    console.log("[XPay SDK] PaymentElement change:", event);
                    setPaymentReady(event.complete);
                  }}
                  onLoadError={(error) => {
                    console.error("[XPay SDK] PaymentElement loaderror:", error);
                  }}
                />

                {/* <div className="my-6 h-px w-full bg-border/50" /> */}
                <div className="my-4 h-px w-full " />

                <Button
                  className="h-10 w-full rounded-md text-sm font-medium"
                  onClick={handleConfirm}
                  disabled={!paymentReady || confirming || !checkout.canConfirm}
                >
                  {confirming
                    ? "Processing..."
                    : `Pay ${checkout.currency} ${(Number(checkout.amountTotal) / 100).toFixed(2)}`}
                </Button>

                {paymentError && (
                  <p className="mt-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                    {paymentError}
                  </p>
                )}

                {!checkout.livemode && (
                  <p className="mt-4 flex items-center justify-center text-xs text-muted-foreground">
                    <svg className="mr-1 h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Test mode — no real charges will be made
                  </p>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={handleRandomize}
        className="fixed bottom-16 right-6 z-50 gap-1.5 rounded-full shadow-lg text-xs text-muted-foreground"
      >
        <Dices className="size-3.5" />
        Randomize Appearance
      </Button>

      {checkout.merchantName && (
        <div className="mt-8 flex items-center justify-center gap-1.5 rounded-lg border border-border/50 bg-muted/30 p-3 text-xs text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5" />
          Paying securely to{" "}
          <span className="font-medium text-foreground">
            {checkout.merchantName}
          </span>
        </div>
      )}
    </div>
  );
}

function CheckoutSkeleton() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <div className="mb-8 flex items-center justify-between">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-5 w-28" />
      </div>
      <div className="grid gap-4 lg:grid-cols-12 lg:gap-10">
        <div className="order-first lg:order-last lg:col-span-5 xl:col-span-4 space-y-4">
          <Skeleton className="h-[350px] rounded-lg" />
          <Skeleton className="h-20 rounded-lg" />
        </div>
        <div className="lg:col-span-7 xl:col-span-8 space-y-4">
          <Skeleton className="h-40 rounded-lg" />
          <Skeleton className="h-[400px] rounded-lg" />
        </div>
      </div>
    </div>
  );
}
