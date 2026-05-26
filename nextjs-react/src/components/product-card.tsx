import { ViewTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import type { Product } from "@/lib/products";
import { formatPrice } from "@/lib/products";

export function ProductCard({ product }: { product: Product }) {
  return (
    <Link
      href={`/product/${product.id}`}
      className="group flex flex-col gap-3"
    >
      <ViewTransition name={`product-image-${product.id}`}>
        <div className="overflow-hidden rounded-lg bg-muted/50 p-6 transition-colors group-hover:bg-muted/80">
          <Image
            src={`/shop/${product.image}`}
            alt={product.name}
            width={400}
            height={400}
            />
        </div>
      </ViewTransition>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-start justify-between gap-4">
          <ViewTransition name={`product-name-${product.id}`}>
            <h3 className="font-medium text-foreground">{product.name}</h3>
          </ViewTransition>
          <p className="shrink-0 text-sm text-muted-foreground">
            {formatPrice(product.price, product.currency)}
          </p>
        </div>
        <p className="line-clamp-2 text-[13px] leading-relaxed text-muted-foreground">
          {product.description}
        </p>
      </div>
    </Link>
  );
}
