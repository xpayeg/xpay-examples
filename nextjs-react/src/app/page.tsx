import { ViewTransition } from "react";
import { products } from "@/lib/products";
import { ProductCard } from "@/components/product-card";
import Link from "next/link";

export default function HomePage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      {/* Hero */}
      <ViewTransition enter="page-crossfade">
        <div className="mb-16 max-w-2xl">
          <h1 className="mb-4 text-3xl font-medium tracking-tight sm:text-4xl">
            XPay Integration Demo
          </h1>
          <p className="text-base leading-relaxed text-muted-foreground">
            Explore three integration patterns — from zero-code redirects to
            fully custom checkout flows.
          </p>
        </div>
      </ViewTransition>

      {/* Integration Patterns */}
      <ViewTransition enter="page-crossfade">
        <div className="mb-20">
          <div className="mb-4 font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Integration Patterns
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <IntegrationCard
              href="/checkout/redirect"
              label="Hosted Checkout"
              desc="Redirect to XPay — zero SDK code required"
              tag="Simplest"
            />
            <IntegrationCard
              href="/donate"
              label="Drop-in Modal"
              desc="Full checkout experience in a popup overlay"
              tag="Low code"
            />
            <IntegrationCard
              href={`/product/${products[0]!.id}`}
              label="Custom Elements"
              desc="Your UI, our secure payment form"
              tag="Full control"
            />
          </div>
        </div>
      </ViewTransition>

      {/* Products */}
      <div>
        <div className="mb-4 flex items-center gap-2">
          <div className="font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Products
          </div>
          <span className="font-mono text-xs tracking-tighter text-muted-foreground/60">
            ({products.length})
          </span>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </div>
  );
}

function IntegrationCard({
  href,
  label,
  desc,
  tag,
}: {
  href: string;
  label: string;
  desc: string;
  tag: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col gap-1 rounded-lg border border-border/50 bg-card/50 px-5 py-4 transition-colors hover:bg-card"
    >
      <div className="mb-1 font-mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground/60">
        {tag}
      </div>
      <div className="font-medium text-foreground group-hover:text-foreground">
        {label}
      </div>
      <div className="text-[13px] leading-relaxed text-muted-foreground group-hover:text-muted-foreground/80">
        {desc}
      </div>
    </Link>
  );
}
