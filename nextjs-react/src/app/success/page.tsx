"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, Clock, ArrowRight } from "lucide-react";

/**
 * Local shape of the subset of CheckoutSessionResponseDto the success page
 * reads. Amounts mirror the API contract — smallest currency unit as `number`.
 * See apps/api/docs/BIGINT_MONEY_HANDLING.md.
 */
interface SessionData {
  id: string;
  status: string;
  paymentStatus: string;
  currency: string;
  amountSubtotal: number;
  amountTotal: number;
  merchantName: string;
  livemode: boolean;
  createdAt: string;
  customer?: {
    name?: string;
    email?: string;
    phone?: string;
  };
  lineItems?: {
    id: string;
    description?: string;
    quantity: number;
    amountTotal?: number;
    price?: {
      unitAmount: number;
      product?: { name: string };
    };
  }[];
  totalDetails?: {
    amountDiscount?: number;
    amountShipping?: number;
    amountTax?: number;
    amountPlatformFee?: number;
    amountCollectedVat?: number;
  };
  discounts?: {
    promotionCodeCode?: string;
    coupon?: { name?: string };
  }[];
  paymentMethodType?: string;
  cardBrand?: string;
  cardLast4?: string;
}

function fmt(amount: number | undefined, currency: string): string {
  if (!amount) return "";
  return `${currency} ${(amount / 100).toFixed(2)}`;
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<SuccessSkeleton />}>
      <SuccessContent />
    </Suspense>
  );
}

function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [session, setSession] = useState<SessionData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) {
      setError("No session ID provided");
      setLoading(false);
      return;
    }

    fetch(`/api/order-status?session_id=${sessionId}`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to fetch order");
        return r.json();
      })
      .then(setSession)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [sessionId]);

  if (loading) return <SuccessSkeleton />;

  if (error || !session) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 py-20 text-center">
        <h1 className="mb-3 text-2xl font-medium tracking-tight">
          Could not load order
        </h1>
        <p className="mb-6 text-sm text-muted-foreground">
          {error || "Session not found"}
        </p>
        <Button asChild className="rounded-md text-sm"><Link href="/">Back to Store</Link></Button>
      </div>
    );
  }

  const isPaid = session.paymentStatus === "paid";
  const date = session.createdAt
    ? new Date(session.createdAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  const td = session.totalDetails;
  const discount = td?.amountDiscount ?? 0;
  const shipping = td?.amountShipping ?? 0;
  const tax = td?.amountTax ?? 0;
  const platformFee = td?.amountPlatformFee ?? 0;
  const vat = td?.amountCollectedVat ?? 0;

  return (
    <div className="mx-auto max-w-xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      {/* Status */}
      <div className="mb-10 text-center">
        <div
          className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full ${
            isPaid ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
          }`}
        >
          {isPaid ? <CheckCircle2 className="h-8 w-8" /> : <Clock className="h-8 w-8" />}
        </div>
        <h1 className="mb-2 text-2xl font-medium tracking-tight">
          {isPaid ? "Payment Confirmed" : "Payment Processing"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {isPaid ? "Thank you for your purchase!" : "Your payment is being processed."}
        </p>
      </div>

      {/* Order card */}
      <div className="overflow-hidden rounded-lg border border-border/50 bg-card/50">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/50 bg-muted/30 px-6 py-4">
          <div>
            <p className="mb-0.5 font-mono text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Order Reference
            </p>
            <p className="font-mono text-xs font-medium">{session.id}</p>
          </div>
          <div className="text-right">
            {date && <p className="mb-1.5 text-xs text-muted-foreground">{date}</p>}
            <Badge
              variant={isPaid ? "default" : "secondary"}
              className="rounded px-2 text-xs font-medium"
            >
              {isPaid ? "Paid" : "Processing"}
            </Badge>
          </div>
        </div>

        {/* Line items */}
        {session.lineItems && session.lineItems.length > 0 && (
          <div className="border-b border-border/50 px-6 py-4">
            <div className="space-y-3">
              {session.lineItems.map((item) => {
                const itemName = item.price?.product?.name ?? item.description ?? "Item";
                const unitPrice = item.price?.unitAmount ?? 0;

                return (
                  <div key={item.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{itemName}</p>
                      <p className="text-xs text-muted-foreground">
                        {fmt(unitPrice, session.currency)} × {item.quantity}
                      </p>
                    </div>
                    <p className="text-sm font-medium">
                      {fmt(item.amountTotal ?? unitPrice * item.quantity, session.currency)}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Discounts */}
        {session.discounts && session.discounts.length > 0 && (
          <div className="border-b border-border/50 px-6 py-3">
            <span className="rounded bg-success/10 px-2 py-0.5 text-xs font-medium text-success ring-1 ring-inset ring-success/20">
              {session.discounts[0]?.promotionCodeCode ??
                session.discounts[0]?.coupon?.name ??
                "Discount Applied"}
            </span>
          </div>
        )}

        {/* Breakdown */}
        <div className="space-y-2 px-6 py-4">
          <Row label="Subtotal" value={fmt(session.amountSubtotal, session.currency)} />
          {discount > 0 && (
            <Row
              label="Discount"
              value={`-${fmt(td?.amountDiscount, session.currency)}`}
              className="font-medium text-success"
            />
          )}
          {shipping > 0 && <Row label="Shipping" value={fmt(td?.amountShipping, session.currency)} />}
          {tax > 0 && <Row label="Tax" value={fmt(td?.amountTax, session.currency)} />}
          {vat > 0 && <Row label="VAT" value={fmt(td?.amountCollectedVat, session.currency)} />}
          {platformFee > 0 && (
            <Row label="Processing Fee" value={fmt(td?.amountPlatformFee, session.currency)} />
          )}

          <div className="my-3 h-px w-full bg-border/50" />

          <div className="flex items-end justify-between">
            <span className="font-mono text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Total
            </span>
            <span className="text-2xl font-medium tracking-tight">
              {fmt(session.amountTotal, session.currency)}
            </span>
          </div>
        </div>

        {/* Customer */}
        {session.customer &&
          (session.customer.email || session.customer.name || session.customer.phone) && (
            <div className="border-t border-border/50 bg-muted/20 px-6 py-4">
              <p className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Customer
              </p>
              <div className="space-y-0.5">
                {session.customer.name && (
                  <p className="text-sm font-medium">{session.customer.name}</p>
                )}
                {session.customer.email && (
                  <p className="text-xs text-muted-foreground">{session.customer.email}</p>
                )}
                {session.customer.phone && (
                  <p className="text-xs text-muted-foreground">{session.customer.phone}</p>
                )}
              </div>
            </div>
          )}

        {/* Payment method */}
        {(session.paymentMethodType || session.cardLast4) && (
          <div className="border-t border-border/50 bg-muted/20 px-6 py-4">
            <p className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Payment Method
            </p>
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-9 items-center justify-center rounded border border-border/50 bg-background">
                <svg className="h-3.5 w-3.5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <p className="text-sm font-medium">
                {session.cardBrand && <span className="capitalize">{session.cardBrand} </span>}
                {session.cardLast4 && <span>•••• {session.cardLast4}</span>}
                {!session.cardLast4 && session.paymentMethodType && (
                  <span className="capitalize">{session.paymentMethodType}</span>
                )}
              </p>
            </div>
          </div>
        )}

        {/* Test mode */}
        {!session.livemode && (
          <div className="border-t border-warning/20 bg-warning/5 px-6 py-3 text-center text-xs text-muted-foreground">
            Test mode — no real charges were made
          </div>
        )}
      </div>

      {/* CTA */}
      <div className="mt-8 flex justify-center">
        <Button asChild className="h-10 rounded-md px-6 text-sm font-medium"><Link href="/">Continue Shopping <ArrowRight className="ml-1.5 h-3.5 w-3.5" /></Link></Button>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string;
  className?: string;
}) {
  if (!value) return null;
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={className || "font-medium text-foreground"}>{value}</span>
    </div>
  );
}

function SuccessSkeleton() {
  return (
    <div className="mx-auto max-w-xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <div className="mb-10 flex flex-col items-center">
        <Skeleton className="mb-4 h-16 w-16 rounded-full" />
        <Skeleton className="mb-2 h-8 w-56" />
        <Skeleton className="h-5 w-72" />
      </div>
      <Skeleton className="h-[500px] rounded-lg" />
    </div>
  );
}
