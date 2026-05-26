"use client";

import { Button } from "@/components/ui/button";
import { Minus, Plus } from "lucide-react";

interface TotalDetails {
  amountDiscount?: number;
  amountShipping?: number;
  amountTax?: number;
  amountPlatformFee?: number;
  amountCollectedVat?: number;
}

interface LineItem {
  id: string;
  description?: string;
  quantity: number;
  amountTotal?: number;
  price?: {
    unitAmount?: number;
    product?: { name: string };
  };
}

interface Discount {
  promotionCodeCode?: string;
  coupon?: { name?: string };
}

export interface OrderSummaryProps {
  currency?: string;
  amountSubtotal?: number;
  amountTotal?: number;
  totalDetails?: TotalDetails;
  lineItems?: LineItem[];
  discounts?: Discount[];
  onUpdateQuantity?: (lineItemId: string, quantity: number) => void;
}

function fmt(amount: number | undefined, currency: string): string {
  if (amount === undefined || amount === null) return "-";
  return `${currency} ${(amount / 100).toFixed(2)}`;
}

export function OrderSummary({
  currency = "",
  amountSubtotal,
  amountTotal,
  totalDetails,
  lineItems,
  discounts,
  onUpdateQuantity,
}: OrderSummaryProps) {
  const td = totalDetails;
  const discount = td?.amountDiscount ?? 0;
  const shipping = td?.amountShipping ?? 0;
  const tax = td?.amountTax ?? 0;
  const platformFee = td?.amountPlatformFee ?? 0;
  const vat = td?.amountCollectedVat ?? 0;
  const hasBreakdown = discount || shipping || tax || platformFee || vat;

  return (
    <div className="flex flex-col">
      {lineItems && lineItems.length > 0 && (
        <div className="mb-4 space-y-3">
          {lineItems.map((item) => {
            const name = item.price?.product?.name ?? item.description ?? "Item";
            const unitPrice = item.price?.unitAmount ?? 0;

            return (
              <div key={item.id} className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{name}</p>
                  <p className="text-xs text-muted-foreground">
                    {fmt(unitPrice, currency)} each
                  </p>
                </div>

                {onUpdateQuantity ? (
                  <div className="flex items-center rounded-md border border-border/50 bg-background">
                    <button
                      onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                      disabled={item.quantity <= 1}
                      className="flex h-6 w-6 items-center justify-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="w-5 text-center text-xs font-medium">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                      className="flex h-6 w-6 items-center justify-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    ×{item.quantity}
                  </span>
                )}

                <span className="min-w-[70px] text-right text-sm font-medium">
                  {fmt(item.amountTotal ?? (unitPrice ?? 0) * item.quantity, currency)}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {discounts && discounts.length > 0 && (
        <div className="mb-4 flex items-center gap-2">
          <span className="rounded bg-success/10 px-2 py-0.5 text-xs font-medium text-success ring-1 ring-inset ring-success/20">
            {discounts[0]?.promotionCodeCode ?? discounts[0]?.coupon?.name ?? "Discount Applied"}
          </span>
        </div>
      )}

      {hasBreakdown && (
        <>
          <div className="my-3 h-px w-full bg-border/50" />
          <div className="space-y-2">
            <Row label="Subtotal" value={fmt(amountSubtotal, currency)} />
            {discount > 0 && <Row label="Discount" value={`-${fmt(td?.amountDiscount, currency)}`} green />}
            {shipping > 0 && <Row label="Shipping" value={fmt(td?.amountShipping, currency)} />}
            {tax > 0 && <Row label="Tax" value={fmt(td?.amountTax, currency)} />}
            {vat > 0 && <Row label="VAT" value={fmt(td?.amountCollectedVat, currency)} />}
            {platformFee > 0 && <Row label="Processing Fee" value={fmt(td?.amountPlatformFee, currency)} />}
          </div>
        </>
      )}

      <div className="my-3 h-px w-full bg-border/50" />
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium">Total</span>
        <span className="text-base font-semibold">
          {fmt(amountTotal, currency)}
        </span>
      </div>
    </div>
  );
}

function Row({ label, value, green }: { label: string; value: string; green?: boolean }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={green ? "font-medium text-success" : "font-medium text-foreground"}>
        {value}
      </span>
    </div>
  );
}
