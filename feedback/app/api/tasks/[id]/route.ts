import { NextRequest, NextResponse } from "next/server";
import { deleteTodo, updateTodo } from "@/lib/db/todo";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await request.json()) as { title?: string; status?: "open" | "done" };

  const patch: Parameters<typeof updateTodo>[1] = {};
  if (body.title !== undefined) patch.title = body.title;
  if (body.status !== undefined) {
    patch.status = body.status;
    patch.completed_at = body.status === "done" ? new Date().toISOString() : null;
  }

  await updateTodo(id, patch);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await deleteTodo(id);
  return NextResponse.json({ ok: true });
}
