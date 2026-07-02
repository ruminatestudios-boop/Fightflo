"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CaptureView } from "@/components/tasks/CaptureView";
import { TaskList } from "@/components/tasks/TaskList";
import { TransportButton } from "@/components/tasks/TransportButton";
import { MicIcon, PlusIcon } from "@/components/tasks/icons";
import { useTasks } from "@/hooks/useTasks";

export default function TasksPage() {
  const { tasks, loading, error, addTask, toggleTask, deleteTask } = useTasks();
  const [draft, setDraft] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const [capturing, setCapturing] = useState(() => searchParams.get("record") === "1");

  useEffect(() => {
    if (searchParams.get("record") === "1") {
      // Strip the param so refreshing this page doesn't re-trigger recording.
      router.replace("/tasks");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleAdd() {
    const title = draft.trim();
    if (!title) return;
    setDraft("");
    await addTask(title, "typed");
  }

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex flex-col">
      <header className="px-4 pt-6 pb-2">
        <h1 className="text-2xl font-semibold tracking-tight">Tasks</h1>
      </header>

      {error && <p className="px-4 text-sm text-[var(--accent-red)]">{error}</p>}

      <main className="flex-1 overflow-y-auto">
        {loading ? (
          <p className="px-4 py-4 text-[var(--muted)] text-sm">Loading…</p>
        ) : (
          <TaskList tasks={tasks} onToggle={toggleTask} onDelete={deleteTask} />
        )}
      </main>

      <footer className="p-4 flex flex-col items-center gap-4 border-t border-[var(--border)]">
        <TransportButton
          variant="active"
          size="xl"
          onClick={() => setCapturing(true)}
          aria-label="Add task by voice"
        >
          <MicIcon className="h-11 w-11" />
        </TransportButton>

        <div className="w-full flex items-center gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="Add a task…"
            className="flex-1 h-11 rounded-full bg-[var(--surface-pill)] border border-[var(--border)] px-4 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-red)]"
          />
          <TransportButton variant="active" onClick={handleAdd} aria-label="Add task">
            <PlusIcon className="h-5 w-5" />
          </TransportButton>
        </div>
      </footer>

      {capturing && (
        <CaptureView onAdd={(title) => addTask(title, "voice")} onClose={() => setCapturing(false)} />
      )}
    </div>
  );
}
