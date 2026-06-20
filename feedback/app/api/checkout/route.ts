import { NextRequest, NextResponse } from "next/server";
import {
  createProCheckoutSession,
  createTopUpCheckoutSession,
  createApiCreditsCheckoutSession,
  type CheckoutPlan,
} from "@/lib/payments/stripe";
import { getAffiliateCodeByCode, getUserById } from "@/lib/db/queries";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: CORS_HEADERS });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(request: NextRequest) {
  try {
    const { plan, userId, email, affiliateCode } = await request.json();

    if (!plan || !userId) {
      return json({ error: "plan and userId required" }, 400);
    }

    let validAffiliateCode: string | undefined;
    if (affiliateCode) {
      const found = await getAffiliateCodeByCode(String(affiliateCode).trim());
      if (found) validAffiliateCode = found.code;
    }

    const checkoutPlan = plan as CheckoutPlan;
    const validPlans = ["pro_monthly", "topup", "api_credits_starter", "api_credits_growth"];
    if (!validPlans.includes(checkoutPlan)) {
      return json({ error: "Invalid plan" }, 400);
    }

    const user = await getUserById(userId);
    if (!user) {
      return json({ error: "User not found" }, 404);
    }

    if (checkoutPlan === "topup" && !user.is_pro) {
      return json({ error: "Pro subscription required before buying scan packs" }, 400);
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001/feedback";

    let successUrl: string;
    let cancelUrl: string;
    if (checkoutPlan === "api_credits_starter" || checkoutPlan === "api_credits_growth") {
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
    if (checkoutPlan === "api_credits_starter" || checkoutPlan === "api_credits_growth") {
      url = await createApiCreditsCheckoutSession({ userId, email, successUrl, cancelUrl, plan: checkoutPlan, affiliateCode: validAffiliateCode });
    } else if (checkoutPlan === "topup") {
      url = await createTopUpCheckoutSession({ userId, email, successUrl, cancelUrl, affiliateCode: validAffiliateCode });
    } else {
      url = await createProCheckoutSession({ userId, email, successUrl, cancelUrl, affiliateCode: validAffiliateCode });
    }

    return json({ url });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Checkout failed" }, 500);
  }
}
