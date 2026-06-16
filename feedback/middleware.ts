import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const basePath = process.env.FEEDBACK_BASE_PATH ?? "/feedback";

/** Dev helper: `?reset=intro` clears any legacy intro cookies. */
export function middleware(request: NextRequest) {
  if (request.nextUrl.searchParams.get("reset") !== "intro") {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.searchParams.delete("reset");

  const response = NextResponse.redirect(url);
  for (const name of ["feedback_intro_session", "feedback_intro_dismissed"]) {
    response.cookies.set(name, "", {
      path: basePath,
      maxAge: 0,
      sameSite: "lax",
    });
  }

  return response;
}

export const config = {
  matcher: ["/"],
};
