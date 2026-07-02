export type TodoStatus = "open" | "done";
export type TodoSource = "voice" | "typed";

export interface TodoItem {
  id: string;
  title: string;
  notes: string | null;
  status: TodoStatus;
  due_date: string | null;
  position: number;
  source: TodoSource;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export type TodoBucket = "today" | "upcoming" | "done";

export function bucketForTodo(item: TodoItem): TodoBucket {
  if (item.status === "done") return "done";
  if (item.due_date && item.due_date > new Date().toISOString().slice(0, 10)) return "upcoming";
  return "today";
}
