import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const basePath = process.env.FEEDBACK_BASE_PATH ?? "/feedback";
const LEGACY_INTRO_COOKIES = ["feedback_intro_session", "feedback_intro_dismissed"];

function clearLegacyIntroCookies(response: NextResponse) {
  for (const name of LEGACY_INTRO_COOKIES) {
    response.cookies.set(name, "", { path: basePath, maxAge: 0, sameSite: "lax" });
    response.cookies.set(name, "", { path: "/", maxAge: 0, sameSite: "lax" });
  }
}

/** Dev helper: `?reset=intro` clears legacy intro cookies. */
export function middleware(request: NextRequest) {
  const isReset = request.nextUrl.searchParams.get("reset") === "intro";
  if (!isReset) {
    const response = NextResponse.next();
    clearLegacyIntroCookies(response);
    return response;
  }

  const url = request.nextUrl.clone();
  url.searchParams.delete("reset");

  const response = NextResponse.redirect(url);
  clearLegacyIntroCookies(response);
  return response;
}

export const config = {
  matcher: ["/", "/feedback", "/feedback/"],
};
