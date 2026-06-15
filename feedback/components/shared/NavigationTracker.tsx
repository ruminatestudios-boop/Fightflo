"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { pushNavRoute } from "@/lib/navigation/sessionNav";

/** Keeps a session-scoped route stack for reliable in-app back navigation. */
export function NavigationTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const query = searchParams.toString();
    const route = query ? `${pathname}?${query}` : pathname;
    pushNavRoute(route);
  }, [pathname, searchParams]);

  return null;
}
