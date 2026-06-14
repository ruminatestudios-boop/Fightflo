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

export type PlanTier = "pro_monthly" | "pro_annual" | "team";

const PRICE_IDS: Record<PlanTier, string | undefined> = {
  pro_monthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID,
  pro_annual: process.env.STRIPE_PRO_ANNUAL_PRICE_ID,
  team: process.env.STRIPE_TEAM_PRICE_ID,
};

export async function createCheckoutSession(input: {
  plan: PlanTier;
  userId: string;
  email?: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<string> {
  const client = getStripe();
  const priceId = PRICE_IDS[input.plan];

  if (!priceId) {
    throw new Error(`Price ID not configured for plan: ${input.plan}`);
  }

  const session = await client.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    customer_email: input.email,
    metadata: { userId: input.userId, plan: input.plan },
    subscription_data: {
      metadata: { userId: input.userId },
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
  pro_monthly: { name: "Pro Monthly", price: "£9.99/mo", analyses: 15 },
  pro_annual: { name: "Pro Annual", price: "£79/yr", analyses: 15 },
  team: { name: "Team", price: "£29.99/mo", analyses: 15 },
} as const;
