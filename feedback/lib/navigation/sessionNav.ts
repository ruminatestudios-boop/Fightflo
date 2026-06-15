const STACK_KEY = "feedback_nav_stack";

function readStack(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(STACK_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((entry): entry is string => typeof entry === "string")
      : [];
  } catch {
    return [];
  }
}

function writeStack(stack: string[]) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(STACK_KEY, JSON.stringify(stack.slice(-30)));
}

/** Record an in-app route (pathname + optional query). */
export function pushNavRoute(route: string) {
  const stack = readStack();
  if (stack[stack.length - 1] === route) return;
  stack.push(route);
  writeStack(stack);
}

/** Drop the current route and return the previous one, if any. */
export function popNavRoute(): string | null {
  const stack = readStack();
  if (stack.length <= 1) return null;
  stack.pop();
  const previous = stack[stack.length - 1] ?? null;
  writeStack(stack);
  return previous;
}
