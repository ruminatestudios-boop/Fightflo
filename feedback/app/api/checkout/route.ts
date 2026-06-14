import { NextRequest, NextResponse } from "next/server";
import { createCheckoutSession } from "@/lib/payments/stripe";
import type { PlanTier } from "@/lib/payments/stripe";

export async function POST(request: NextRequest) {
  try {
    const { plan, userId, email } = await request.json();

    if (!plan || !userId) {
      return NextResponse.json(
        { error: "plan and userId required" },
        { status: 400 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001";

    const url = await createCheckoutSession({
      plan: plan as PlanTier,
      userId,
      email,
      successUrl: `${appUrl}?upgraded=true`,
      cancelUrl: `${appUrl}?upgraded=false`,
    });

    return NextResponse.json({ url });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Checkout failed" },
      { status: 500 }
    );
  }
}
