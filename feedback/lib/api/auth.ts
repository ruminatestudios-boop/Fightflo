import type { NextRequest } from "next/server";
import { validateApiKey, type ApiKey } from "@/lib/api-keys";

export function getStoredUserIdFromRequest(request: NextRequest): string | null {
  return (
    request.nextUrl.searchParams.get("userId") ??
    request.headers.get("x-user-id") ??
    null
  );
}

export async function validateBearerApiKey(request: NextRequest): Promise<ApiKey | null> {
  const auth = request.headers.get("authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return null;
  const raw = auth.slice(7).trim();
  return validateApiKey(raw);
}
