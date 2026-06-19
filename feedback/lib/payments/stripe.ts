import { PRICING, TOPUP_SCAN_PACK, API_CREDITS_STARTER_CALLS, API_CREDITS_GROWTH_CALLS } from "@/config/pricing";
import Stripe from "stripe";

let stripe: Stripe | null = null;

function getStripe(): Stripe {
  if (!stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
    stripe = new Stripe(key);
  }
  return stripe;
}

export type CheckoutPlan = "pro_monthly" | "topup" | "api_credits_starter" | "api_credits_growth";

function getProMonthlyPriceId(): string {
  const priceId = process.env.STRIPE_PRO_MONTHLY_PRICE_ID?.trim();
  if (!priceId) throw new Error("STRIPE_PRO_MONTHLY_PRICE_ID is not configured");
  return priceId;
}

function getTopUpPriceId(): string {
  const priceId = process.env.STRIPE_TOPUP_PRICE_ID?.trim();
  if (!priceId) throw new Error("STRIPE_TOPUP_PRICE_ID is not configured");
  return priceId;
}

export async function createProCheckoutSession(input: {
  userId: string;
  email?: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<string> {
  const client = getStripe();

  const session = await client.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: getProMonthlyPriceId(), quantity: 1 }],
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    customer_email: input.email,
    metadata: { userId: input.userId, plan: "pro_monthly" },
    subscription_data: {
      metadata: { userId: input.userId },
    },
  });

  if (!session.url) throw new Error("Failed to create checkout session");
  return session.url;
}

export async function createTopUpCheckoutSession(input: {
  userId: string;
  email?: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<string> {
  const client = getStripe();

  const session = await client.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [{ price: getTopUpPriceId(), quantity: 1 }],
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    customer_email: input.email,
    metadata: {
      userId: input.userId,
      plan: "topup",
      scans: String(TOPUP_SCAN_PACK),
    },
  });

  if (!session.url) throw new Error("Failed to create checkout session");
  return session.url;
}

function getApiCreditsStarterPriceId(): string {
  const priceId = process.env.STRIPE_API_CREDITS_STARTER_PRICE_ID?.trim();
  if (!priceId) throw new Error("STRIPE_API_CREDITS_STARTER_PRICE_ID is not configured");
  return priceId;
}

function getApiCreditsGrowthPriceId(): string {
  const priceId = process.env.STRIPE_API_CREDITS_GROWTH_PRICE_ID?.trim();
  if (!priceId) throw new Error("STRIPE_API_CREDITS_GROWTH_PRICE_ID is not configured");
  return priceId;
}

export async function createApiCreditsCheckoutSession(input: {
  userId: string;
  email?: string;
  successUrl: string;
  cancelUrl: string;
  plan: "api_credits_starter" | "api_credits_growth";
}): Promise<string> {
  const client = getStripe();
  const isStarter = input.plan === "api_credits_starter";

  const session = await client.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [{
      price: isStarter ? getApiCreditsStarterPriceId() : getApiCreditsGrowthPriceId(),
      quantity: 1,
    }],
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    customer_email: input.email,
    metadata: {
      userId: input.userId,
      plan: input.plan,
      calls: String(isStarter ? API_CREDITS_STARTER_CALLS : API_CREDITS_GROWTH_CALLS),
    },
  });

  if (!session.url) throw new Error("Failed to create checkout session");
  return session.url;
}

export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET is not configured");
  return getStripe().webhooks.constructEvent(payload, signature, secret);
}

export const PLANS = {
  pro_monthly: {
    name: "Pro",
    price: PRICING.pro.displayMonthly,
    priceGbp: PRICING.pro.monthlyPriceGbp,
    analyses: PRICING.pro.scansPerMonth,
  },
  topup: {
    name: "Scan pack",
    price: PRICING.topUp.display,
    priceGbp: PRICING.topUp.priceGbp,
    analyses: PRICING.topUp.scans,
  },
} as const;
