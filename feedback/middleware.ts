import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const INTRO_DISMISSED_COOKIE = "feedback_intro_session";
const basePath = process.env.FEEDBACK_BASE_PATH ?? "/feedback";

/** Dismiss intro without client JS — anchor href `/?started=1` sets session cookie + redirects. */
export function middleware(request: NextRequest) {
  if (request.nextUrl.searchParams.get("reset") === "intro") {
    const url = request.nextUrl.clone();
    url.searchParams.delete("reset");
    const response = NextResponse.redirect(url);
    response.cookies.set(INTRO_DISMISSED_COOKIE, "", {
      path: basePath,
      maxAge: 0,
      sameSite: "lax",
    });
    return response;
  }

  if (request.nextUrl.searchParams.get("started") !== "1") {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.searchParams.delete("started");

  const response = NextResponse.redirect(url);
  response.cookies.set(INTRO_DISMISSED_COOKIE, "1", {
    path: basePath,
    sameSite: "lax",
  });

  return response;
}

export const config = {
  matcher: ["/"],
};
