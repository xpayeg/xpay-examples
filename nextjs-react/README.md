# XPay Next.js example store

A working Next.js demo showing every XPay SDK integration pattern: hosted checkout, drop-in modal, embedded inline checkout, and the custom Elements API. Clone, plug in your API keys, run.

> Full docs: **<https://docs.xpay.app>**

## What's inside

| Route | What it shows |
|---|---|
| `/` | Storefront with products and a cart |
| `/checkout?ui=hosted` | Server creates a session, redirects to XPay-hosted checkout |
| `/checkout?ui=embedded` | XPay drop-in modal opened via `xpay.checkout()` |
| `/checkout?ui=custom` | Fully custom UI using `<XPayProvider>` + `<PaymentElement>` |
| `/donate` | Drop-in modal with dynamic amounts |
| `/success` | Server-side session retrieval + receipt |
| `/api/webhooks` | Signature-verified webhook receiver |

## Prerequisites

- Node ≥ 18
- An XPay account → publishable key (`pk_test_…`) and secret key (`sk_test_…`) from the dashboard

## Quick start

```bash
# 1. Install
npm install           # or pnpm install / yarn

# 2. Configure
cp .env.local.example .env.local
# fill in XPAY_SECRET_KEY, NEXT_PUBLIC_XPAY_PUBLISHABLE_KEY,
# and XPAY_WEBHOOK_SECRET

# 3. Run
npm run dev           # http://localhost:3000
```

Open <http://localhost:3000>, click through the integration patterns, pay with a test card.

| Test card | Expiry | CVV |
|---|---|---|
| `5123 4500 0000 0008` | `01/39` | `100` |

Full test-card list at <https://docs.xpay.app/get-started/test-mode>.

## Environment variables

See [`.env.local.example`](./.env.local.example) for the full list with inline docs.

| Variable | Where used |
|---|---|
| `XPAY_SECRET_KEY` | Server. Calls `POST /checkout/sessions`. |
| `NEXT_PUBLIC_XPAY_PUBLISHABLE_KEY` | Browser. Passed to `loadXPay()` from [`@xpayeg/sdk`](https://www.npmjs.com/package/@xpayeg/sdk). |
| `XPAY_WEBHOOK_SECRET` | Server. Verifies signatures in `/api/webhooks`. |
| `NEXT_PUBLIC_APP_URL` | Server. Builds the `afterCompletion.redirect.url`. |

## How the SDK is loaded

`loadXPay()` (from [`@xpayeg/sdk`](https://www.npmjs.com/package/@xpayeg/sdk)) handles everything. It injects the SDK runtime script on first call, caches the instance, and returns the same one on subsequent calls. You never reference the runtime URL yourself.

```ts
// src/components/xpay-loader.tsx
import { loadXPay } from "@xpayeg/sdk";
export const xpayPromise = loadXPay(process.env.NEXT_PUBLIC_XPAY_PUBLISHABLE_KEY!);
```

Call this at module level (once per page), then pass `xpayPromise` to `<XPayProvider xpay={xpayPromise}>` or wherever you need it. No script tags, no CDN URLs in your code.

## Deploy to Vercel

1. Push this directory to a Git repo
2. Import it into Vercel
3. Set the four environment variables from above
4. Set `NEXT_PUBLIC_APP_URL` to your assigned production URL
5. Deploy

## Packages used

- [`@xpayeg/sdk`](https://www.npmjs.com/package/@xpayeg/sdk) for the loader and TypeScript types
- [`@xpayeg/react`](https://www.npmjs.com/package/@xpayeg/react) for the React bindings (`<XPayProvider>`, `useCheckout`, `<PaymentElement>`, `<CheckoutButton>`)
- Next.js 16, React 19, Tailwind v4, shadcn-style UI components

## Where to go from here

- Vanilla version (no framework, no build step) → [`../vanilla-html`](../vanilla-html/)
- Full docs → <https://docs.xpay.app>
- Source for these examples → <https://github.com/xpayeg/xpay-examples>
