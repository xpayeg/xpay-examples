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
