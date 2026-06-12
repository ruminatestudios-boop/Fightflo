import { NextResponse } from "next/server";
import { ensureUser } from "@/lib/db/users";
import { appOrigin, getStripe, stripePriceId } from "@/lib/stripe-server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json(
      { error: "Stripe is not configured" },
      { status: 503 }
    );
  }

  let body: {
    deviceId?: string;
    plan?: "monthly" | "annual";
    returnPath?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const deviceId = body.deviceId?.trim();
  const plan = body.plan === "annual" ? "annual" : "monthly";
  const returnPath =
    body.returnPath?.startsWith("/") && !body.returnPath.includes("://")
      ? body.returnPath
      : "/bag";
  if (!deviceId) {
    return NextResponse.json({ error: "deviceId required" }, { status: 400 });
  }

  const priceId = stripePriceId(plan);
  if (!priceId) {
    return NextResponse.json(
      { error: "Price not configured for plan" },
      { status: 503 }
    );
  }

  await ensureUser(deviceId);

  const origin = appOrigin();

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}${returnPath}?pro=true`,
      cancel_url: `${origin}${returnPath}`,
      client_reference_id: deviceId,
      metadata: { deviceId, plan },
      subscription_data: {
        metadata: { deviceId, plan },
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("checkout session error", err);
    return NextResponse.json(
      { error: "Could not create checkout session" },
      { status: 500 }
    );
  }
}
