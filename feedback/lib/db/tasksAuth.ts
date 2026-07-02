import { NextRequest } from "next/server";

export function isTasksApiAuthorized(request: NextRequest): boolean {
  const secret = process.env.TASKS_API_SECRET?.trim();
  if (!secret) return false;
  const provided = request.headers.get("x-tasks-secret")?.trim();
  return provided === secret;
}
