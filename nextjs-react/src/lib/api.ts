const API_URL = process.env.XPAY_API_URL ?? "https://api.xpay.app";
const SECRET_KEY = process.env.XPAY_SECRET_KEY ?? "";

export interface CreateCheckoutParams {
  uiMode: "hosted" | "embedded" | "custom";
  items: { productId: string; quantity: number; customAmount?: number }[];
  allowPromotionCodes?: boolean;
  successUrl?: string;
}

export async function createCheckoutSession(params: CreateCheckoutParams) {
  const { products } = await import("./products");

  const lineItems = params.items.map((item) => {
    // Support custom amount items (e.g. donations)
    if (item.customAmount) {
      return {
        priceData: {
          unitAmount: item.customAmount,
          currency: "EGP",
          productData: {
            name: "Donation",
            description: "Open source contribution",
          },
        },
        quantity: item.quantity,
      };
    }

    const product = products.find((p) => p.id === item.productId);
    if (!product) throw new Error(`Product not found: ${item.productId}`);

    return {
      priceData: {
        unitAmount: product.price,
        currency: product.currency,
        productData: {
          name: product.name,
          description: product.description,
        },
      },
      quantity: item.quantity,
    };
  });

  const body: Record<string, unknown> = {
    uiMode: params.uiMode,
    lineItems,
    afterCompletion: {
      type: "redirect",
      redirect: {
        url:
          params.successUrl ??
          `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3004"}/success?session_id={CHECKOUT_SESSION_ID}`,
      },
    },
  };

  if (params.allowPromotionCodes) {
    body.allowPromotionCodes = true;
  }

  body.feeConfig = {
    feesPassThrough: true,
    vatCollectionEnabled: true,
    vatCollectionRate: 1400,
  };

  const response = await fetch(`${API_URL}/checkout/sessions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Request failed" }));
    throw new Error(error.message ?? `API error: ${response.status}`);
  }

  return await response.json();
}

// ── Deferred Elements ─────────────────────────────────────────
//
// Deferred mode renders the Payment Element with NO session; the session is
// created here, at pay time, with the final total. Two rules make it safe:
//
// 1. Charge = display. The session's total must equal exactly the amount the
//    element showed, or XPay refuses the confirmation with
//    `amount_reconfirmation_required` and nothing is charged. That is why
//    fee pass-through and VAT collection are disabled: they would inflate
//    the total past the displayed amount. Show final amounts in deferred mode.
//
// 2. One session per checkout. A retry confirms with the SAME clientSecret,
//    keeping the whole transaction lifecycle on one Payment Intent. When the
//    cart changed between attempts, update the existing session's line items
//    instead of creating a new session.

export interface DeferredCheckoutItem {
  productId: string;
  quantity: number;
}

async function buildDeferredLineItems(items: DeferredCheckoutItem[]) {
  const { products } = await import("./products");

  return items.map((item) => {
    const product = products.find((p) => p.id === item.productId);
    if (!product) throw new Error(`Product not found: ${item.productId}`);

    return {
      priceData: {
        unitAmount: product.price,
        currency: product.currency,
        productData: {
          name: product.name,
          description: product.description,
        },
      },
      quantity: item.quantity,
    };
  });
}

export async function createDeferredCheckoutSession(items: DeferredCheckoutItem[]) {
  const lineItems = await buildDeferredLineItems(items);

  const response = await fetch(`${API_URL}/checkout/sessions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      uiMode: "custom",
      lineItems,
      afterCompletion: {
        type: "redirect",
        redirect: {
          url: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/success?session_id={CHECKOUT_SESSION_ID}`,
        },
      },
      // Charge = display (rule 1 above).
      feeConfig: {
        feesPassThrough: false,
        vatCollectionEnabled: false,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Request failed" }));
    throw new Error(error.message ?? `API error: ${response.status}`);
  }

  return await response.json();
}

/**
 * Update the EXISTING deferred session's line items (full replacement) when
 * the cart changed between attempts — one session, one Payment Intent
 * (rule 2 above).
 */
export async function updateDeferredCheckoutSessionItems(
  sessionId: string,
  items: DeferredCheckoutItem[],
) {
  const lineItems = await buildDeferredLineItems(items);

  const response = await fetch(`${API_URL}/checkout/sessions/${sessionId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ lineItems }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Request failed" }));
    throw new Error(error.message ?? `API error: ${response.status}`);
  }

  return await response.json();
}

export async function getCheckoutSession(sessionId: string) {
  const response = await fetch(`${API_URL}/checkout/sessions/${sessionId}`, {
    headers: {
      Authorization: `Bearer ${SECRET_KEY}`,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Request failed" }));
    throw new Error(error.message ?? `API error: ${response.status}`);
  }

  return response.json();
}
