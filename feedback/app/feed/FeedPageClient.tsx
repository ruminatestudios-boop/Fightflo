"use client";

import { NetflixHome } from "@/components/netflix/NetflixHome";
import { PwaInstallModal } from "@/components/shared/PwaInstallModal";

/** Alternate homepage preview — photo cards + carousel at /feed */
export function FeedPageClient() {
  return (
    <>
      <NetflixHome homeRoute="feed" />
      <PwaInstallModal />
    </>
  );
}

