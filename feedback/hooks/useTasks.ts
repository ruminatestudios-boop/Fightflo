"use client";

import { useCallback, useEffect, useState } from "react";
import { isSupabaseBrowserConfigured, supabaseBrowser } from "@/lib/supabase/browserClient";
import { getTasksApiSecret } from "@/hooks/usePasscodeGate";
import type { TodoItem, TodoSource } from "@/types/todo";

function authHeaders(): HeadersInit {
  const secret = getTasksApiSecret();
  return secret ? { "x-tasks-secret": secret } : {};
}

function upsertTodo(items: TodoItem[], item: TodoItem): TodoItem[] {
  const existing = items.findIndex((t) => t.id === item.id);
  if (existing === -1) return [...items, item].sort((a, b) => a.position - b.position);
  const next = [...items];
  next[existing] = item;
  return next.sort((a, b) => a.position - b.position);
}

export function useTasks() {
  const [tasks, setTasks] = useState<TodoItem[]>([]);
  const [loading, setLoading] = useState(isSupabaseBrowserConfigured);
  const [error, setError] = useState<string | null>(
    isSupabaseBrowserConfigured ? null : "Supabase isn't configured for this app yet."
  );

  useEffect(() => {
    if (!isSupabaseBrowserConfigured) return;

    let cancelled = false;

    supabaseBrowser
      .from("todo")
      .select("*")
      .order("position", { ascending: true })
      .then(({ data, error: fetchError }) => {
        if (cancelled) return;
        if (fetchError) {
          setError(fetchError.message);
        } else {
          setTasks((data as TodoItem[]) ?? []);
        }
        setLoading(false);
      });

    const channel = supabaseBrowser
      .channel("todo-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "todo" },
        (payload) => {
          if (payload.eventType === "DELETE") {
            const oldId = (payload.old as { id: string }).id;
            setTasks((current) => current.filter((t) => t.id !== oldId));
          } else {
            setTasks((current) => upsertTodo(current, payload.new as TodoItem));
          }
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabaseBrowser.removeChannel(channel);
    };
  }, []);

  const addTask = useCallback(async (title: string, source: TodoSource = "typed") => {
    const optimistic: TodoItem = {
      id: crypto.randomUUID(),
      title,
      notes: null,
      status: "open",
      due_date: null,
      position: Date.now() / 1000,
      source,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      completed_at: null,
    };
    setTasks((current) => upsertTodo(current, optimistic));

    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ title, source }),
    });

    if (!res.ok) {
      setTasks((current) => current.filter((t) => t.id !== optimistic.id));
      setError("Couldn't save that task. Try again.");
      return null;
    }

    const { task } = (await res.json()) as { task: TodoItem };
    setTasks((current) => upsertTodo(current.filter((t) => t.id !== optimistic.id), task));
    return task;
  }, []);

  const toggleTask = useCallback(async (task: TodoItem) => {
    const nextStatus = task.status === "open" ? "done" : "open";
    setTasks((current) =>
      upsertTodo(current, {
        ...task,
        status: nextStatus,
        completed_at: nextStatus === "done" ? new Date().toISOString() : null,
      })
    );
    await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ status: nextStatus }),
    });
  }, []);

  const deleteTask = useCallback(async (taskId: string) => {
    setTasks((current) => current.filter((t) => t.id !== taskId));
    await fetch(`/api/tasks/${taskId}`, { method: "DELETE", headers: authHeaders() });
  }, []);

  return { tasks, loading, error, addTask, toggleTask, deleteTask };
}
