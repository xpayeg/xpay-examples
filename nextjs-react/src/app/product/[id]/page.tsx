"use client";

import { useState, use } from "react";
import { ViewTransition } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import Image from "next/image";
import { products, getProduct, formatPrice } from "@/lib/products";
import { createCheckoutSession } from "@/lib/checkout";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Minus, Plus } from "lucide-react";

export default function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const product = getProduct(id);
  const router = useRouter();
  const [quantity, setQuantity] = useState(1);

  const { mutate: buyNow, isPending: isBuying } = useMutation({
    mutationFn: (items: { productId: string; quantity: number }[]) => createCheckoutSession(items),
    onSuccess: (data) => {
      router.push(`/checkout?cs=${encodeURIComponent(data.clientSecret)}`);
    },
  });

  if (!product) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-7xl flex-col items-center justify-center px-4 py-20 text-center sm:px-6 lg:px-8">
        <h1 className="mb-3 text-2xl font-medium tracking-tight">
          Product Not Found
        </h1>
        <p className="mb-6 text-sm text-muted-foreground">
          The item you are looking for does not exist or has been removed.
        </p>
        <Link
          href="/"
          className="inline-flex items-center text-sm text-primary hover:underline"
        >
          <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back to collection
        </Link>
      </div>
    );
  }

  const handleBuyNow = () => {
    buyNow([{ productId: product.id, quantity }]);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <Link
        href="/"
        className="group mb-8 inline-flex items-center text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="mr-1.5 h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
        Back to collection
      </Link>

      <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
        {/* Image — shared transition with product card */}
        <ViewTransition name={`product-image-${product.id}`}>
          <div className="flex items-center justify-center overflow-hidden rounded-lg bg-muted/50 p-12">
            <Image
              src={`/shop/${product.image}`}
              alt={product.name}
              width={500}
              height={500}
  
            />
          </div>
        </ViewTransition>

        {/* Details */}
        <ViewTransition enter="page-slide-forward" exit="page-slide-back">
          <div className="flex flex-col justify-center">
            <div className="mb-1 font-mono text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
              {product.category}
            </div>

            <ViewTransition name={`product-name-${product.id}`}>
              <h1 className="mb-4 text-2xl font-medium tracking-tight lg:text-3xl">
                {product.name}
              </h1>
            </ViewTransition>

            <p className="mb-8 text-sm leading-relaxed text-muted-foreground">
              {product.description}
            </p>

            <p className="mb-8 text-2xl font-medium tracking-tight">
              {formatPrice(product.price, product.currency)}
            </p>

            <div className="mb-8 h-px w-full bg-border/50" />

            {/* Quantity */}
            <div className="mb-8 flex items-center gap-6">
              <span className="font-mono text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Qty
              </span>
              <div className="flex items-center rounded-md border border-border/50 bg-card/50">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1}
                  className="flex h-9 w-9 items-center justify-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="w-10 text-center text-sm font-medium">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity((q) => q + 1)}
                  className="flex h-9 w-9 items-center justify-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button
                size="lg"
                onClick={handleBuyNow}
                disabled={isBuying}
                className="h-11 w-full rounded-md text-sm font-medium sm:flex-1"
              >
                {isBuying ? "Creating checkout..." : "Buy Now"}
              </Button>
              {quantity > 1 && (
                <div className="flex h-11 w-full items-center justify-center rounded-md border border-border/50 bg-card/50 px-6 text-sm font-medium sm:w-auto">
                  Total:{" "}
                  {formatPrice(product.price * quantity, product.currency)}
                </div>
              )}
            </div>
          </div>
        </ViewTransition>
      </div>

      {/* Related */}
      <div className="mt-20 border-t border-border/50 pt-12">
        <div className="mb-6 font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          You might also like
        </div>
        <div className="grid gap-6 sm:grid-cols-3">
          {products
            .filter((p) => p.id !== product.id)
            .slice(0, 3)
            .map((p) => (
              <Link
                key={p.id}
                href={`/product/${p.id}`}
                className="group flex items-center gap-4 rounded-lg border border-border/50 bg-card/50 p-3 transition-colors hover:bg-card"
              >
                <ViewTransition name={`product-image-${p.id}`}>
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted/50 p-2">
                    <Image
                      src={`/shop/${p.image}`}
                      alt={p.name}
                      width={64}
                      height={64}
  
                    />
                  </div>
                </ViewTransition>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{p.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatPrice(p.price, p.currency)}
                  </p>
                </div>
              </Link>
            ))}
        </div>
      </div>
    </div>
  );
}
