import { NextRequest, NextResponse } from "next/server";
import { createContentLink, deleteContentLink, listContentLinks } from "@/lib/db/queries";

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

  const links = await listContentLinks(500);
  return NextResponse.json({ links });
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    url?: string;
    label?: string;
    tags?: string[];
    notes?: string;
  };

  if (!body.url?.trim()) {
    return NextResponse.json({ error: "url required" }, { status: 400 });
  }

  await createContentLink({
    url: body.url,
    label: body.label,
    tags: body.tags,
    notes: body.notes,
  });

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

  await deleteContentLink(id);
  return NextResponse.json({ ok: true });
}
