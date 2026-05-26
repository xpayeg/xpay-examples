"use client";

import { useState } from "react";
import { products, formatPrice } from "@/lib/products";
import { Button } from "@/components/ui/button";
import { Minus, Plus, ArrowRight } from "lucide-react";

export default function HostedRedirectPage() {
  const [selectedProduct, setSelectedProduct] = useState(products[0]!);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCheckout = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uiMode: "hosted",
          items: [{ productId: selectedProduct.id, quantity }],
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Failed to create checkout");

      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <div className="mb-8">
        <div className="mb-1 font-mono text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
          Hosted Checkout
        </div>
        <h1 className="mb-2 text-2xl font-medium tracking-tight">
          Simple Redirect
        </h1>
        <p className="text-sm text-muted-foreground">
          No SDK needed — create a session, redirect, done.
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-border/50 bg-card/50">
        <div className="p-6">
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="font-mono text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Product
              </label>
              <div className="relative">
                <select
                  value={selectedProduct.id}
                  onChange={(e) =>
                    setSelectedProduct(products.find((p) => p.id === e.target.value)!)
                  }
                  className="flex h-10 w-full appearance-none rounded-md border border-border/50 bg-background px-3 text-sm font-medium transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {formatPrice(p.price, p.currency)}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground">
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="font-mono text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Quantity
              </label>
              <div className="flex w-fit items-center rounded-md border border-border/50 bg-background">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1}
                  className="flex h-9 w-9 items-center justify-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="w-10 text-center text-sm font-medium">{quantity}</span>
                <button
                  onClick={() => setQuantity((q) => q + 1)}
                  className="flex h-9 w-9 items-center justify-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>

          <div className="my-6 h-px w-full bg-border/50" />

          <div className="mb-6 flex items-end justify-between">
            <span className="font-mono text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Total
            </span>
            <span className="text-2xl font-medium tracking-tight">
              {formatPrice(selectedProduct.price * quantity, selectedProduct.currency)}
            </span>
          </div>

          <Button
            size="lg"
            className="h-10 w-full rounded-md text-sm font-medium"
            onClick={handleCheckout}
            disabled={loading}
          >
            {loading ? (
              "Redirecting..."
            ) : (
              <>
                Continue to Payment <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </>
            )}
          </Button>

          {error && (
            <p className="mt-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </p>
          )}
        </div>

        {/* How it works */}
        <div className="border-t border-border/50 bg-muted/30 p-6">
          <h3 className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            How it works
          </h3>
          <ol className="space-y-2.5 text-[13px] text-muted-foreground">
            <li className="flex items-start gap-2.5">
              <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/10 font-mono text-[9px] font-bold text-primary">
                1
              </span>
              Server calls{" "}
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground">
                POST /checkout/sessions
              </code>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/10 font-mono text-[9px] font-bold text-primary">
                2
              </span>
              Response includes a secure{" "}
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground">
                url
              </code>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/10 font-mono text-[9px] font-bold text-primary">
                3
              </span>
              Redirect customer to that URL
            </li>
            <li className="flex items-start gap-2.5">
              <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/10 font-mono text-[9px] font-bold text-primary">
                4
              </span>
              After payment, XPay redirects back to your success page
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}
