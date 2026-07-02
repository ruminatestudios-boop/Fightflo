"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTasks } from "@/hooks/useTasks";

function buildTitle(title: string | null, text: string | null, url: string | null): string {
  const primary = title?.trim() || text?.trim() || "";
  if (url && !primary.includes(url)) {
    return primary ? `${primary} — ${url}` : url;
  }
  return primary || url || "Shared link";
}

export function ShareTargetHandler() {
  const params = useSearchParams();
  const router = useRouter();
  const { addTask } = useTasks();
  const [status, setStatus] = useState<"saving" | "error">("saving");
  const submitted = useRef(false);

  useEffect(() => {
    if (submitted.current) return;
    submitted.current = true;

    const title = buildTitle(params.get("title"), params.get("text"), params.get("url"));

    addTask(title, "typed")
      .then((task) => {
        if (task) {
          router.replace("/tasks");
        } else {
          setStatus("error");
        }
      })
      .catch(() => setStatus("error"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-[var(--background)] flex items-center justify-center px-6">
      <p className="text-[var(--muted)] text-sm text-center">
        {status === "saving" ? "Adding to Tasks…" : "Couldn't save that — open Tasks to try again."}
      </p>
    </div>
  );
}
