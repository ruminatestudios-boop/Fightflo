"use client";

import { useEffect } from "react";
import { withBasePath } from "@/lib/paths";
import { isPwaInstalled, markPwaInstalled } from "@/lib/pwa-install";

export function PWARegister() {
  useEffect(() => {
    if (isPwaInstalled()) markPwaInstalled();
  }, []);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV === "development") {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((reg) => reg.unregister());
      });
      return;
    }

    navigator.serviceWorker.register(withBasePath("/sw.js")).then((registration) => {
      void registration.update();
    }).catch(() => {
      /* optional */
    });
  }, []);

  return null;
}
