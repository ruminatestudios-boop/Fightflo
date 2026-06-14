import { NextRequest, NextResponse } from "next/server";
import {
  createProCheckoutSession,
  createTopUpCheckoutSession,
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
    if (checkoutPlan !== "pro_monthly" && checkoutPlan !== "topup") {
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
    const successUrl =
      checkoutPlan === "topup"
        ? `${appUrl}?topup=success`
        : `${appUrl}?upgraded=true`;
    const cancelUrl =
      checkoutPlan === "topup"
        ? `${appUrl}?topup=cancel`
        : `${appUrl}?upgraded=false`;

    const url =
      checkoutPlan === "topup"
        ? await createTopUpCheckoutSession({
            userId,
            email,
            successUrl,
            cancelUrl,
          })
        : await createProCheckoutSession({
            userId,
            email,
            successUrl,
            cancelUrl,
          });

    return NextResponse.json({ url });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Checkout failed" },
      { status: 500 }
    );
  }
}
