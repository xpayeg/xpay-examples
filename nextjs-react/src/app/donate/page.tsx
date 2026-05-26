"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { xpayPromise } from "@/components/xpay-loader";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CheckCircle2 } from "lucide-react";
import type { CheckoutInstance } from "@xpayeg/sdk";

const presetAmounts = [1000, 2500, 5000, 10000, 25000];

type CheckoutMode = "modal" | "inline";

export default function DonatePage() {
  const [amount, setAmount] = useState(5000);
  const [mode, setMode] = useState<CheckoutMode>("modal");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [donated, setDonated] = useState(false);
  const { resolvedTheme } = useTheme();

  const inlineContainerRef = useRef<HTMLDivElement | null>(null);
  const checkoutRef = useRef<CheckoutInstance | null>(null);

  const teardownCheckout = () => {
    if (checkoutRef.current) {
      checkoutRef.current.destroy();
      checkoutRef.current = null;
    }
    if (inlineContainerRef.current) {
      inlineContainerRef.current.innerHTML = "";
    }
  };

  useEffect(() => {
    teardownCheckout();
    setError("");
  }, [mode]);

  useEffect(() => {
    return () => {
      teardownCheckout();
    };
  }, []);

  const handleDonate = async () => {
    setLoading(true);
    setError("");
    teardownCheckout();

    try {
      const response = await fetch("/api/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uiMode: "embedded",
          items: [{ productId: "donate", quantity: 1, customAmount: amount }],
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Failed to create session");

      const xpay = await xpayPromise;
      if (!xpay) throw new Error("XPay SDK not loaded");

      const colorMode = resolvedTheme === "dark" ? "dark" : "light";

      if (mode === "inline") {
        const container = inlineContainerRef.current;
        if (!container) throw new Error("Inline container not mounted");

        checkoutRef.current = xpay.checkout({
          clientSecret: data.clientSecret,
          mode: "inline",
          container,
          appearance: { colorMode },
          onComplete: () => setDonated(true),
          onError: (err) => {
            console.error("Checkout error", err);
            setError(err.message);
          },
          onClose: () => setDonated(false),
          onReady: (session) => {
            console.log("Session ready", session);
          },
          onConfirmed: () => {
            console.log("Payment confirmed");
          },
        });
      } else {
        const checkout = xpay.checkout({
          clientSecret: data.clientSecret,
          mode: "modal",
          appearance: { colorMode },
          onComplete: () => setDonated(true),
          onError: (err) => {
            console.error("Checkout error", err);
            setError(err.message);
          },
          onClose: () => setDonated(false),
          onReady: (session) => {
            console.log("Session ready", session);
          },
          onConfirmed: () => {
            console.log("Payment confirmed");
          },
        });
        checkoutRef.current = checkout;
        checkout.open();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  if (donated) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 py-20 text-center">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <h1 className="mb-3 text-2xl font-medium tracking-tight">Thank you!</h1>
        <p className="mb-8 text-sm text-muted-foreground">
          Your donation of{" "}
          <span className="font-medium text-foreground">
            EGP {(amount / 100).toFixed(2)}
          </span>{" "}
          has been received.
        </p>
        <Button
          className="rounded-md text-sm font-medium"
          onClick={() => {
            teardownCheckout();
            setDonated(false);
          }}
        >
          Donate Again
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <div className="mb-8">
        <div className="mb-1 font-mono text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
          Drop-in Checkout
        </div>
        <h1 className="mb-2 text-2xl font-medium tracking-tight">
          Support Open Source
        </h1>
        <p className="text-sm text-muted-foreground">
          Choose modal or inline to compare the two drop-in mount modes.
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-border/50 bg-card/50">
        <div className="p-6">
          <label className="mb-3 block font-mono text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Mount mode
          </label>
          <div className="mb-8 grid grid-cols-2 gap-2">
            {(["modal", "inline"] as const).map((option) => (
              <button
                key={option}
                onClick={() => setMode(option)}
                className={cn(
                  "flex h-10 items-center justify-center rounded-md border text-sm font-medium capitalize transition-colors",
                  mode === option
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border/50 bg-background text-muted-foreground hover:border-primary/30 hover:text-foreground",
                )}
              >
                {option}
              </button>
            ))}
          </div>

          <label className="mb-3 block font-mono text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Select amount (EGP)
          </label>
          <div className="mb-8 grid grid-cols-5 gap-2">
            {presetAmounts.map((preset) => (
              <button
                key={preset}
                onClick={() => setAmount(preset)}
                className={cn(
                  "flex h-10 items-center justify-center rounded-md border text-sm font-medium transition-colors",
                  amount === preset
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border/50 bg-background text-muted-foreground hover:border-primary/30 hover:text-foreground",
                )}
              >
                {(preset / 100).toFixed(0)}
              </button>
            ))}
          </div>

          <div className="mb-8 rounded-md bg-muted/50 py-6 text-center">
            <p className="mb-1 font-mono text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              You are donating
            </p>
            <p className="text-3xl font-medium tracking-tight">
              EGP {(amount / 100).toFixed(2)}
            </p>
          </div>

          <Button
            className="h-10 w-full rounded-md text-sm font-medium"
            onClick={handleDonate}
            disabled={loading}
          >
            {loading && (
              <svg className="mr-2 h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            Donate
          </Button>

          {error && (
            <p className="mt-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </p>
          )}

          <div
            ref={inlineContainerRef}
            className={cn("mt-6", mode === "inline" ? "block" : "hidden")}
          />
        </div>
      </div>
    </div>
  );
}
