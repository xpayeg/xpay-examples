"use client";

import { loadXPay } from "@xpayeg/sdk";

/**
 * Load XPay at module level — called once, shared across all components.
 * The publishable key authenticates all SDK API calls.
 */
export const xpayPromise = loadXPay(
  process.env.NEXT_PUBLIC_XPAY_PUBLISHABLE_KEY!,
);
