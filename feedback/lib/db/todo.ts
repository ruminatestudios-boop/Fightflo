import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type TodoStatus = "open" | "done";
export type TodoSource = "voice" | "typed";

export interface TodoRecord {
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

function getSupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Supabase environment variables are not configured");
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function listTodos(): Promise<TodoRecord[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("todo")
    .select()
    .order("position", { ascending: true });

  if (error) throw error;
  return (data as TodoRecord[]) ?? [];
}

export async function createTodo(input: {
  title: string;
  source: TodoSource;
  position: number;
}): Promise<TodoRecord> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("todo")
    .insert({
      title: input.title.trim(),
      source: input.source,
      position: input.position,
    })
    .select()
    .single();

  if (error) throw error;
  return data as TodoRecord;
}

export async function updateTodo(
  id: string,
  patch: Partial<Pick<TodoRecord, "title" | "status" | "completed_at">>
): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from("todo").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteTodo(id: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from("todo").delete().eq("id", id);
  if (error) throw error;
}
