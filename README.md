# XPay — Examples

Working integrations of the XPay JavaScript SDK. Each subfolder is a standalone, deployable example you can clone, configure, and run.

> Full SDK documentation: **<https://docs.xpay.app>**

## Examples

| Example | Stack | What it demonstrates |
|---|---|---|
| [`nextjs-react`](./nextjs-react) | Next.js 16, React 19, Tailwind v4 | Full storefront with all four checkout modes (hosted, drop-in, embedded, custom Elements), promo codes, webhooks |
| [`vanilla-html`](./vanilla-html) | Single HTML file + tiny Express server | Minimal "drop a script tag, get a checkout button" — the smallest possible integration |

## Packages

Both examples use the published npm packages:

- **[`@xpayeg/sdk`](https://github.com/xpayeg/xpay-js)** — vanilla JavaScript SDK + TypeScript types
- **[`@xpayeg/react`](https://github.com/xpayeg/xpay-react)** — React bindings (`XPayProvider`, `useCheckout`, `<PaymentElement>`, etc.)

## Getting an XPay account

Sign up at [xpay.app](https://xpay.app), then grab your **publishable key** (`pk_test_…`) and **secret key** (`sk_test_…`) from Dashboard → Developers → API keys. Each example's README explains how to plug them in.

## License

MIT — see [LICENSE](./LICENSE). Copy, modify, ship.
