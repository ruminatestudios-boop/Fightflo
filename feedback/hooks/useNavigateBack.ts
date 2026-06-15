"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { popNavRoute } from "@/lib/navigation/sessionNav";
import { withBasePath } from "@/lib/paths";

/**
 * Browser-style back: prefers the in-app session stack, then browser history,
 * then a safe fallback (e.g. direct link to a report).
 */
export function useNavigateBack(fallbackHref = "/") {
  const router = useRouter();
  const fallback = withBasePath(fallbackHref);

  return useCallback(() => {
    const previousRoute = popNavRoute();
    if (previousRoute) {
      router.push(previousRoute);
      return;
    }

    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }

    router.push(fallback);
  }, [router, fallback]);
}
