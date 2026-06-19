import { NextRequest, NextResponse } from "next/server";
import {
  createProCheckoutSession,
  createTopUpCheckoutSession,
  createApiCreditsCheckoutSession,
  type CheckoutPlan,
} from "@/lib/payments/stripe";
import { getUserById } from "@/lib/db/queries";

export async function POST(request: NextRequest) {
  try {
    const { plan, userId, email } = await request.json();

    if (!plan || !userId) {
      return NextResponse.json(
        { error: "plan and userId required" },
        { status: 400 }
      );
    }

    const checkoutPlan = plan as CheckoutPlan;
    if (checkoutPlan !== "pro_monthly" && checkoutPlan !== "topup" && checkoutPlan !== "api_credits") {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const user = await getUserById(userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (checkoutPlan === "topup" && !user.is_pro) {
      return NextResponse.json(
        { error: "Pro subscription required before buying scan packs" },
        { status: 400 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001/feedback";

    let successUrl: string;
    let cancelUrl: string;
    if (checkoutPlan === "api_credits") {
      successUrl = `${appUrl}/developer?credits=success`;
      cancelUrl = `${appUrl}/developer?credits=cancel`;
    } else if (checkoutPlan === "topup") {
      successUrl = `${appUrl}?topup=success`;
      cancelUrl = `${appUrl}?topup=cancel`;
    } else {
      successUrl = `${appUrl}?upgraded=true`;
      cancelUrl = `${appUrl}?upgraded=false`;
    }

    let url: string;
    if (checkoutPlan === "api_credits") {
      url = await createApiCreditsCheckoutSession({ userId, email, successUrl, cancelUrl });
    } else if (checkoutPlan === "topup") {
      url = await createTopUpCheckoutSession({ userId, email, successUrl, cancelUrl });
    } else {
      url = await createProCheckoutSession({ userId, email, successUrl, cancelUrl });
    }

    return NextResponse.json({ url });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Checkout failed" },
      { status: 500 }
    );
  }
}
