import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { setUserPro, setUserProByStripeCustomer } from "@/lib/db/users";
import { getStripe } from "@/lib/stripe-server";

export const runtime = "nodejs";

async function activatePro(session: Stripe.Checkout.Session): Promise<void> {
  const deviceId =
    session.metadata?.deviceId ?? session.client_reference_id ?? undefined;
  const plan =
    session.metadata?.plan === "annual" ? "annual" : "monthly";

  if (!deviceId) return;

  await setUserPro(deviceId, true, {
    stripeCustomerId:
      typeof session.customer === "string" ? session.customer : undefined,
    stripeSubscriptionId:
      typeof session.subscription === "string"
        ? session.subscription
        : undefined,
    plan,
  });
}

export async function POST(request: Request) {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripe || !webhookSecret) {
    return NextResponse.json(
      { error: "Webhook not configured" },
      { status: 503 }
    );
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const rawBody = await request.text();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error("webhook signature error", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === "subscription" && session.payment_status === "paid") {
          await activatePro(session);
        }
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const deviceId = sub.metadata?.deviceId;
        if (deviceId) {
          await setUserPro(deviceId, false);
        } else if (sub.customer) {
          const customerId =
            typeof sub.customer === "string" ? sub.customer : sub.customer.id;
          await setUserProByStripeCustomer(customerId, false);
        }
        break;
      }
      default:
        break;
    }
  } catch (err) {
    console.error("webhook handler error", err);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
