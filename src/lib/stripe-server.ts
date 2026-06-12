import Stripe from "stripe";

let stripeClient: Stripe | null = null;

export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  if (!stripeClient) {
    stripeClient = new Stripe(key);
  }
  return stripeClient;
}

export function stripePriceId(plan: "monthly" | "annual"): string | null {
  if (plan === "monthly") return process.env.STRIPE_MONTHLY_PRICE_ID ?? null;
  return process.env.STRIPE_ANNUAL_PRICE_ID ?? null;
}

export function appOrigin(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "https://fightflo.app"
  );
}
