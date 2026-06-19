import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "crypto";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase not configured");
  return createClient(url, key);
}

export interface ApiKey {
  id: string;
  user_id: string;
  key_prefix: string; // first 8 chars shown in UI e.g. "ff_live_"
  key_hash: string;   // SHA-256 of full key, stored only
  label: string;
  created_at: string;
  last_used_at: string | null;
  call_count: number;
  revoked: boolean;
}

export interface ApiKeyWithSecret extends ApiKey {
  secret: string; // returned ONCE on creation only
}

function hashKey(key: string): string {
  // Use Web Crypto in Edge, crypto in Node
  const { createHash } = require("crypto") as typeof import("crypto");
  return createHash("sha256").update(key).digest("hex");
}

export function generateApiKey(): { key: string; prefix: string; hash: string } {
  const raw = randomBytes(24).toString("base64url");
  const key = `ff_${raw}`;
  const prefix = key.slice(0, 10);
  const hash = hashKey(key);
  return { key, prefix, hash };
}

export async function createApiKey(userId: string, label: string): Promise<ApiKeyWithSecret> {
  const { key, prefix, hash } = generateApiKey();
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("api_keys")
    .insert({ user_id: userId, key_prefix: prefix, key_hash: hash, label })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return { ...(data as ApiKey), secret: key };
}

export async function listApiKeys(userId: string): Promise<ApiKey[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("api_keys")
    .select("id, user_id, key_prefix, label, created_at, last_used_at, call_count, revoked")
    .eq("user_id", userId)
    .eq("revoked", false)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as ApiKey[];
}

export async function revokeApiKey(keyId: string, userId: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("api_keys")
    .update({ revoked: true })
    .eq("id", keyId)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
}

export async function validateApiKey(rawKey: string): Promise<ApiKey | null> {
  if (!rawKey.startsWith("ff_")) return null;
  const hash = hashKey(rawKey);
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("api_keys")
    .select()
    .eq("key_hash", hash)
    .eq("revoked", false)
    .single();

  if (error || !data) return null;

  // Update last_used_at and increment call_count (fire and forget)
  void supabase
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString(), call_count: (data as ApiKey).call_count + 1 })
    .eq("id", (data as ApiKey).id);

  return data as ApiKey;
}
