"use client";

import { TaskGroup } from "./TaskGroup";
import { EmptyState } from "./EmptyState";
import { bucketForTodo, type TodoItem } from "@/types/todo";

export function TaskList({
  tasks,
  onToggle,
  onDelete,
}: {
  tasks: TodoItem[];
  onToggle: (task: TodoItem) => void;
  onDelete: (taskId: string) => void;
}) {
  if (tasks.length === 0) return <EmptyState />;

  const today = tasks.filter((t) => bucketForTodo(t) === "today");
  const upcoming = tasks.filter((t) => bucketForTodo(t) === "upcoming");
  const done = tasks.filter((t) => bucketForTodo(t) === "done");

  return (
    <div className="flex flex-col gap-6 px-4 py-4">
      <TaskGroup label="Today" tasks={today} onToggle={onToggle} onDelete={onDelete} />
      <TaskGroup label="Upcoming" tasks={upcoming} onToggle={onToggle} onDelete={onDelete} />
      <TaskGroup label="Done" tasks={done} onToggle={onToggle} onDelete={onDelete} />
    </div>
  );
}
