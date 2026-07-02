"use client";

import { TrashIcon, CheckIcon } from "./icons";
import type { TodoItem } from "@/types/todo";

export function TaskCard({
  task,
  onToggle,
  onDelete,
}: {
  task: TodoItem;
  onToggle: (task: TodoItem) => void;
  onDelete: (taskId: string) => void;
}) {
  const done = task.status === "done";

  return (
    <div className="surface-card flex items-center gap-3 px-4 py-3">
      <button
        type="button"
        onClick={() => onToggle(task)}
        aria-pressed={done}
        aria-label={done ? "Mark as not done" : "Mark as done"}
        className={`h-6 w-6 shrink-0 rounded-full border flex items-center justify-center transition-colors ${
          done
            ? "bg-[var(--accent-red)] border-[var(--accent-red)]"
            : "bg-[var(--surface-pill)] border-[var(--border)]"
        }`}
      >
        {done && <CheckIcon className="h-4 w-4 text-white" />}
      </button>

      <span
        className={`flex-1 text-[15px] ${
          done ? "text-[var(--muted)] line-through" : "text-[var(--foreground)]"
        }`}
      >
        {task.title}
      </span>

      <button
        type="button"
        onClick={() => onDelete(task.id)}
        className="text-[var(--muted)] hover:text-[var(--accent-red)] transition-colors p-1"
        aria-label="Delete task"
      >
        <TrashIcon className="h-4 w-4" />
      </button>
    </div>
  );
}
