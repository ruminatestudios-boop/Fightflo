import { NextRequest, NextResponse } from "next/server";
import { constructWebhookEvent } from "@/lib/payments/stripe";
import { setUserPro } from "@/lib/db/queries";
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
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId =
          typeof subscription.customer === "string"
            ? subscription.customer
            : subscription.customer.id;
        await setUserPro(customerId, subscription.status);
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId =
          typeof subscription.customer === "string"
            ? subscription.customer
            : subscription.customer.id;
        await setUserPro(customerId, "canceled");
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
