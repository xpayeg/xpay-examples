// Express server for the vanilla XPay examples. One job: serve the static
// HTML pages and provide a few JSON endpoints that create / retrieve XPay
// Checkout Sessions on the backend, so your secret key never reaches the
// browser.
//
// This is intentionally minimal — ~130 lines, no abstractions. Read it
// top to bottom alongside the docs at https://docs.xpay.app

import "dotenv/config";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = process.env.PORT || 4242;
const XPAY_SECRET_KEY = process.env.XPAY_SECRET_KEY;
const XPAY_PUBLISHABLE_KEY = process.env.XPAY_PUBLISHABLE_KEY;
const XPAY_API_URL = process.env.XPAY_API_URL || "https://api.xpay.app";
const APP_URL = process.env.APP_URL || `http://localhost:${PORT}`;

if (!XPAY_SECRET_KEY) {
  console.error("Missing XPAY_SECRET_KEY in .env");
  process.exit(1);
}
if (!XPAY_PUBLISHABLE_KEY) {
  console.error("Missing XPAY_PUBLISHABLE_KEY in .env");
  process.exit(1);
}

// Catalog of fake products. Real merchants would read from their own DB.
const PRODUCTS = {
  premium: { name: "Premium Plan", unitAmount: 50000, currency: "EGP" },
  basic: { name: "Basic Plan", unitAmount: 10000, currency: "EGP" },
};

const app = express();
app.use(express.json());

/**
 * GET /config.js
 *
 * Tiny JS module that exposes the publishable key to the browser. Each
 * HTML page imports `PUBLISHABLE_KEY` from here, so the key lives in
 * exactly one place (.env) and the static pages stay generic.
 *
 * The publishable key is safe to expose — it's designed for browser use.
 * The secret key never leaves the server.
 */
app.get("/config.js", (_req, res) => {
  res.type("application/javascript").send(
    `export const PUBLISHABLE_KEY = ${JSON.stringify(XPAY_PUBLISHABLE_KEY)};\n`,
  );
});

app.use(express.static(path.join(__dirname, "public")));

/**
 * POST /api/create-checkout
 *
 * One endpoint, three modes — picks `uiMode` per the integration pattern
 * being demoed by the calling page:
 *
 *   - "embedded" → Drop-in modal / inline (the SDK opens it in an iframe)
 *   - "custom"   → Elements / Card Element (your form, our payment element)
 *   - "hosted"   → Hosted Checkout (server redirects to session.url)
 *
 * Body: { productId: "premium" | "basic", uiMode: "embedded" | "custom" | "hosted" }
 */
app.post("/api/create-checkout", async (req, res) => {
  const product = PRODUCTS[req.body.productId];
  if (!product) return res.status(400).json({ error: "Unknown product" });

  const uiMode = req.body.uiMode ?? "embedded";
  if (!["embedded", "custom", "hosted"].includes(uiMode)) {
    return res.status(400).json({ error: "Invalid uiMode" });
  }

  try {
    const body = {
      uiMode,
      lineItems: [
        {
          priceData: {
            unitAmount: product.unitAmount,
            currency: product.currency,
            productData: { name: product.name },
          },
          quantity: 1,
        },
      ],
      // Where the customer lands after a successful payment.
      // `{CHECKOUT_SESSION_ID}` is a template — XPay substitutes the real
      // session ID before redirecting, so your success page can fetch it
      // back via GET /api/session/:id.
      afterCompletion: {
        type: "redirect",
        redirect: { url: `${APP_URL}/success.html?session_id={CHECKOUT_SESSION_ID}` },
      },
      // Demo: enable promo codes so the Elements page can show the
      // applyPromotionCode() flow.
      allowPromotionCodes: true,
      // Demo: enable fee pass-through + VAT collection so the order summary
      // has real "Processing fee" and "VAT" lines to render. In your real
      // integration, these come from your XPay account settings — you only
      // need to set them per-session if you want to override the defaults.
      feeConfig: {
        feesPassThrough: true,
        vatCollectionEnabled: true,
        vatCollectionRate: 1400, // 14% in basis points
      },
    };

    const response = await fetch(`${XPAY_API_URL}/checkout/sessions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${XPAY_SECRET_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("XPay API error:", response.status, error);
      return res.status(502).json({ error: "Failed to create session" });
    }

    const session = await response.json();

    // What the frontend needs:
    //   - clientSecret → for the SDK to scope itself to this session
    //   - url          → for hosted-redirect to navigate to
    //   - id           → handy for analytics / linking back to /success
    res.json({
      clientSecret: session.clientSecret,
      url: session.url,
      id: session.id,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal error" });
  }
});

/**
 * GET /api/session/:id
 *
 * Used by the success page to render order details using server-side data
 * (the secret-key call). Never trust the SDK's `onComplete` payload alone
 * as authorization — the webhook + this endpoint are the sources of truth.
 */
app.get("/api/session/:id", async (req, res) => {
  try {
    const response = await fetch(`${XPAY_API_URL}/checkout/sessions/${req.params.id}`, {
      headers: { Authorization: `Bearer ${XPAY_SECRET_KEY}` },
    });
    if (!response.ok) return res.status(404).json({ error: "Session not found" });
    res.json(await response.json());
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal error" });
  }
});

app.listen(PORT, () => {
  console.log(`XPay vanilla examples running at ${APP_URL}`);
});
