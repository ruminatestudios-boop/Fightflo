import { NextRequest, NextResponse } from "next/server";
import { createApiKey, listApiKeys } from "@/lib/api-keys";
import { getStoredUserIdFromRequest } from "@/lib/api/auth";

export async function GET(request: NextRequest) {
  const userId = getStoredUserIdFromRequest(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const keys = await listApiKeys(userId);
    return NextResponse.json({ keys });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const userId = getStoredUserIdFromRequest(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { label } = (await request.json()) as { label?: string };
    const key = await createApiKey(userId, label?.trim() || "My API Key");
    return NextResponse.json({ key }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
