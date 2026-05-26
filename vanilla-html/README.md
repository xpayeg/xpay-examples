# XPay Vanilla HTML examples

A tour of every XPay integration pattern, in plain HTML and JavaScript. No framework, no build step. One Express server, one folder of static HTML files, every page focused on a single integration.

> Full docs: **<https://docs.xpay.app>**

## What's inside

```
public/
├── index.html              ← landing: which pattern fits which use case
├── drop-in-modal.html      ← xpay.checkout({ mode: "modal" })   (recommended starter)
├── drop-in-inline.html     ← xpay.checkout({ mode: "inline" })
├── elements.html           ← xpay.initCheckout() + PaymentElement   (recommended for custom UI)
├── hosted-redirect.html    ← navigate to session.url, no JS SDK
├── success.html            ← server-side session retrieval + receipt
└── shared/
    ├── styles.css          ← light/dark theme via `[data-theme]`
    └── theme.js            ← theme picker + `themechange` event
server.js                   ← Express: serves /public, creates sessions, retrieves them, exposes /config.js
```

Each `*.html` is fully self-contained. Open one to read exactly what the SDK call looks like.

## Which one should I start with?

| You want… | Use this |
|---|---|
| Shortest path to a working checkout | `drop-in-modal.html` |
| Checkout inside the page (no overlay) | `drop-in-inline.html` |
| Full control over your form design and layout | `elements.html` |
| No JS at all, redirect the customer to XPay | `hosted-redirect.html` |

The drop-in patterns wrap XPay's full payment UI in an iframe (fastest to integrate). The Elements pattern lets you build the surrounding form yourself; XPay only owns the secure card fields.

## Prerequisites

- Node ≥ 18
- An XPay account → publishable key (`pk_test_…`) and secret key (`sk_test_…`) from the dashboard

## Run it

```bash
# 1. Install
npm install                 # or: pnpm install / yarn

# 2. Configure
cp .env.example .env
# fill in XPAY_SECRET_KEY and XPAY_PUBLISHABLE_KEY

# 3. Run
npm run dev                 # http://localhost:4242
```

Open <http://localhost:4242> in your browser, click through the patterns, pay with a test card.

| Test card | Expiry | CVV |
|---|---|---|
| `5123 4500 0000 0008` | `01/39` | `100` |

Full test-card list at <https://docs.xpay.app/get-started/test-mode>.

## Environment variables

See [`.env.example`](./.env.example) for the full list with inline docs.

| Variable | Where used |
|---|---|
| `XPAY_SECRET_KEY` | Server. Authenticates `POST /checkout/sessions` and `GET /checkout/sessions/:id`. |
| `XPAY_PUBLISHABLE_KEY` | Browser. Exposed via the server's `/config.js` route so HTML pages don't have to be edited. Safe to expose by design. |
| `APP_URL` | Server. Used to build the `afterCompletion.redirect.url` for the success page. Defaults to `http://localhost:4242`. |
| `XPAY_API_URL` | Optional. Overrides the API host. Defaults to `https://api.xpay.app`. |

## How it works

The server is intentionally small (~130 lines). One endpoint creates Checkout Sessions with different `uiMode` values depending on which pattern called it:

| Pattern | `uiMode` sent to API |
|---|---|
| Drop-in modal and inline | `embedded` |
| Elements (PaymentElement) | `custom` |
| Hosted Checkout | `hosted` |

The browser then either:

1. Hands the `clientSecret` to the SDK (drop-in and Elements paths), or
2. Navigates to `session.url` (hosted path).

After payment, XPay redirects the customer back to `success.html?session_id=…`, which fetches the session from the server with the secret key. Never trust the SDK callback alone for fulfilment.

The publishable key reaches the browser through `GET /config.js`. The server renders that route on the fly as a one-line ES module (`export const PUBLISHABLE_KEY = "..."`) so the static HTML files stay generic and the key lives in exactly one place (`.env`).

## Theme switching

Every page has a Light / Dark / System picker in the header. It writes to `localStorage` so the choice persists across pages, applies `data-theme` to `<html>` for the host page's CSS, and for the **Elements** page also calls `checkout.changeAppearance({ colorMode })` to keep the payment UI in sync at runtime.

The **drop-in** pages pick up the theme **at modal open time** only. The SDK's `CheckoutInstance` doesn't expose a runtime `changeAppearance()`. Toggle the theme before clicking Pay.

## Webhooks

This example doesn't include a webhook receiver. See the [Next.js example](../nextjs-react/) for a working signed handler. In production, the `checkout.session.completed` webhook is the source of truth for fulfilment.

## Where to go from here

- React version → [`../nextjs-react`](../nextjs-react/)
- Full docs → <https://docs.xpay.app>
- Source for these examples → <https://github.com/xpayeg/xpay-examples>
