import { NextRequest, NextResponse } from "next/server";
import { deleteTestimonial, listTestimonials, setTestimonialApproved } from "@/lib/db/queries";

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.ADMIN_SECRET?.trim();
  if (!secret) return false;
  const provided = request.headers.get("x-admin-secret")?.trim();
  return provided === secret;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const testimonials = await listTestimonials(200);
  return NextResponse.json({ testimonials });
}

export async function PATCH(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { id?: string; approved?: boolean };
  if (!body.id || body.approved === undefined) {
    return NextResponse.json({ error: "id and approved required" }, { status: 400 });
  }

  await setTestimonialApproved(body.id, body.approved);
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  await deleteTestimonial(id);
  return NextResponse.json({ ok: true });
}
