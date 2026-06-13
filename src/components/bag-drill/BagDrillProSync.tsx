"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { registerDevice, syncProFromServer } from "@/lib/pro-sync";

interface BagDrillProSyncProps {
  onProReturn: () => void;
  onRefreshPro: () => void;
}

/** Isolated so useSearchParams does not suspend/remount the whole app shell. */
export function BagDrillProSync({ onProReturn, onRefreshPro }: BagDrillProSyncProps) {
  const searchParams = useSearchParams();

  useEffect(() => {
    onRefreshPro();
    void registerDevice();
    void syncProFromServer().then(() => onRefreshPro());

    if (searchParams.get("pro") === "true") {
      onProReturn();
    }
  }, [searchParams, onProReturn, onRefreshPro]);

  return null;
}
