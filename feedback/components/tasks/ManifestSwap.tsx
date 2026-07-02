"use client";

import { useEffect } from "react";

// Next 14's root `app/manifest.ts` file-convention link wins over a nested
// layout's `metadata.manifest`, so the <head> ends up pointing at Fightflo's
// manifest even on /tasks pages. Swapping the href client-side, immediately
// on mount, is the standard workaround — it runs well before a user could
// tap "Add to Home Screen".
export function ManifestSwap() {
  useEffect(() => {
    const link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    if (link) link.href = "/tasks/manifest.webmanifest";
  }, []);

  return null;
}
