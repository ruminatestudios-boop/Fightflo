import { TaskCard } from "./TaskCard";
import type { TodoItem } from "@/types/todo";

export function TaskGroup({
  label,
  tasks,
  onToggle,
  onDelete,
}: {
  label: string;
  tasks: TodoItem[];
  onToggle: (task: TodoItem) => void;
  onDelete: (taskId: string) => void;
}) {
  if (tasks.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-xs uppercase tracking-[0.08em] text-[var(--muted)] px-1">{label}</h2>
      <div className="flex flex-col gap-2">
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} onToggle={onToggle} onDelete={onDelete} />
        ))}
      </div>
    </div>
  );
}
