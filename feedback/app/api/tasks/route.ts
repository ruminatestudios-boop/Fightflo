import { NextRequest, NextResponse } from "next/server";
import { createTodo, listTodos } from "@/lib/db/todo";

export async function GET() {
  const todos = await listTodos();
  return NextResponse.json({ tasks: todos });
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { title?: string; source?: "voice" | "typed" };
  const title = body.title?.trim();
  if (!title) {
    return NextResponse.json({ error: "title required" }, { status: 400 });
  }

  const task = await createTodo({
    title,
    source: body.source === "typed" ? "typed" : "voice",
    position: Date.now() / 1000,
  });
  return NextResponse.json({ task });
}
