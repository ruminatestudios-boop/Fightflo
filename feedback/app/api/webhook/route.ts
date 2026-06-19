import { NextRequest, NextResponse } from "next/server";
import { TOPUP_SCAN_PACK } from "@/config/pricing";
import { constructWebhookEvent } from "@/lib/payments/stripe";
import {
  addBonusScans,
  addApiCredits,
  linkStripeCustomer,
  setUserPro,
} from "@/lib/db/queries";
import { saveUserEmail } from "@/lib/email/notifications";
import type Stripe from "stripe";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  try {
    const event = constructWebhookEvent(body, signature);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const plan = session.metadata?.plan;

        if (!userId) break;

        if (session.mode === "payment" && plan === "topup") {
          const scans = Number(session.metadata?.scans) || TOPUP_SCAN_PACK;
          await addBonusScans(userId, scans);
          break;
        }

        if (session.mode === "payment" && (plan === "api_credits_starter" || plan === "api_credits_growth")) {
          const calls = Number(session.metadata?.calls) || 10;
          await addApiCredits(userId, calls);
          break;
        }

        const customerId =
          typeof session.customer === "string"
            ? session.customer
            : session.customer?.id;
        const email =
          session.customer_details?.email ??
          session.customer_email ??
          undefined;

        if (customerId) {
          await linkStripeCustomer(userId, customerId, email);
          if (email) {
            await saveUserEmail({ userId, email }).catch(() => undefined);
          }
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId =
          typeof subscription.customer === "string"
            ? subscription.customer
            : subscription.customer.id;
        const userId = subscription.metadata?.userId ?? null;
        await setUserPro(customerId, subscription.status, userId);
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId =
          typeof subscription.customer === "string"
            ? subscription.customer
            : subscription.customer.id;
        const userId = subscription.metadata?.userId ?? null;
        await setUserPro(customerId, "canceled", userId);
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[webhook]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Webhook error" },
      { status: 400 }
    );
  }
}
