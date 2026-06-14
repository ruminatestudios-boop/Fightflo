"use client";

export function DevModeBanner() {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) return null;

  return (
    <div className="rounded-full bg-[#2a2a2a] px-4 py-2.5 text-center text-[11px] text-white/50">
      Demo mode — add <code className="text-[#ff9500]">.env</code> for real analysis
    </div>
  );
}
