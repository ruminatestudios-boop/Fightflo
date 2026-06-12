"use client";

import { useCallback, useEffect, useState } from "react";
import { registerDevice, syncProFromServer } from "@/lib/pro-sync";
import { isPro, setPro as persistPro } from "@/lib/subscription";

export function usePro() {
  const [pro, setProState] = useState(false);

  useEffect(() => {
    setProState(isPro());
    void registerDevice();
    void syncProFromServer().then((active) => {
      if (active) setProState(true);
      else setProState(isPro());
    });

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("pro") === "true") {
        void syncProFromServer().then((active) => {
          if (active) setProState(true);
        });
      }
    }
  }, []);

  const activatePro = useCallback(() => {
    persistPro(true);
    setProState(true);
  }, []);

  const refresh = useCallback(() => {
    void syncProFromServer().then((active) => {
      setProState(active || isPro());
    });
  }, []);

  return { pro, activatePro, refresh };
}
