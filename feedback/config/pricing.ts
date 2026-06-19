/**
 * Retail pricing — keep in sync with Stripe Product catalogue.
 */

export const PRO_MONTHLY_SCANS = 15;
export const TOPUP_SCAN_PACK = 5;

export const PRO_MONTHLY_PRICE_GBP = 12.99;
export const TOPUP_PACK_PRICE_GBP = 5.99;

export function formatGbp(amount: number, suffix = ""): string {
  const rounded = Number.isInteger(amount) ? amount.toString() : amount.toFixed(2);
  return `£${rounded}${suffix}`;
}

export const API_CREDITS_STARTER_CALLS = 10;
export const API_CREDITS_STARTER_PRICE_GBP = 9.99;

export const API_CREDITS_GROWTH_CALLS = 100;
export const API_CREDITS_GROWTH_PRICE_GBP = 49.99;

export const PRICING = {
  pro: {
    scansPerMonth: PRO_MONTHLY_SCANS,
    monthlyPriceGbp: PRO_MONTHLY_PRICE_GBP,
    displayMonthly: formatGbp(PRO_MONTHLY_PRICE_GBP, "/mo"),
  },
  topUp: {
    scans: TOPUP_SCAN_PACK,
    priceGbp: TOPUP_PACK_PRICE_GBP,
    display: formatGbp(TOPUP_PACK_PRICE_GBP, ` for ${TOPUP_SCAN_PACK} scans`),
    displayShort: formatGbp(TOPUP_PACK_PRICE_GBP),
  },
  free: {
    lifetimeScans: 3,
    priceGbp: 0,
  },
  apiCreditsStarter: {
    calls: API_CREDITS_STARTER_CALLS,
    priceGbp: API_CREDITS_STARTER_PRICE_GBP,
    display: formatGbp(API_CREDITS_STARTER_PRICE_GBP, ` for ${API_CREDITS_STARTER_CALLS} calls`),
    displayShort: formatGbp(API_CREDITS_STARTER_PRICE_GBP),
    perCall: formatGbp(API_CREDITS_STARTER_PRICE_GBP / API_CREDITS_STARTER_CALLS),
  },
  apiCreditsGrowth: {
    calls: API_CREDITS_GROWTH_CALLS,
    priceGbp: API_CREDITS_GROWTH_PRICE_GBP,
    display: formatGbp(API_CREDITS_GROWTH_PRICE_GBP, ` for ${API_CREDITS_GROWTH_CALLS} calls`),
    displayShort: formatGbp(API_CREDITS_GROWTH_PRICE_GBP),
    perCall: formatGbp(API_CREDITS_GROWTH_PRICE_GBP / API_CREDITS_GROWTH_CALLS),
  },
} as const;
