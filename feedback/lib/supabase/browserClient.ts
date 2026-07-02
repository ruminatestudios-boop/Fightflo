import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const isSupabaseBrowserConfigured = Boolean(url && anonKey);

// Anon-key client for the browser. Only used for reads and realtime
// subscriptions — writes to `todo` go through /api/tasks* using the
// service-role key, since RLS denies anon insert/update/delete.
export const supabaseBrowser = createClient(
  url || "https://placeholder.supabase.co",
  anonKey || "placeholder",
  { auth: { persistSession: false, autoRefreshToken: false } }
);
