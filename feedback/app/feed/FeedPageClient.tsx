"use client";

import { useEffect } from "react";
import { NetflixHome } from "@/components/netflix/NetflixHome";
import { PwaInstallModal } from "@/components/shared/PwaInstallModal";
import { storeCrewToken } from "@/lib/storage/client";

export function FeedPageClient() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const crewParam = params.get("crew");
    if (crewParam) {
      storeCrewToken(crewParam);
      params.delete("crew");
      const qs = params.toString();
      window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
    }
  }, []);

  return (
    <>
      <NetflixHome homeRoute="feed" />
      <PwaInstallModal />
    </>
  );
}
