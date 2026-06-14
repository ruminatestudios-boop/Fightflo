"use client";

import { usePwaInstall } from "@/hooks/usePwaInstall";
import { BAG_COPY } from "@/lib/bag-drill/copy";

export function PwaInstallBanner() {
  const { visible, installing, install, dismiss } = usePwaInstall();

  if (!visible) return null;

  return (
    <div className="nike-card rounded-xl border border-white/10 p-4">
      <p className="text-sm font-medium text-white">{BAG_COPY.installTitle}</p>
      <p className="mt-1 text-xs leading-relaxed text-white/50">
        {BAG_COPY.installBody}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={installing}
          onClick={() => void install()}
          className="rounded-xl bg-[#fa4141] px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.1em] text-white disabled:opacity-50"
        >
          {installing ? "Installing…" : BAG_COPY.installCta}
        </button>
        <button
          type="button"
          onClick={dismiss}
          className="rounded-xl border border-white/15 px-5 py-2.5 text-xs uppercase tracking-[0.1em] text-white/50"
        >
          {BAG_COPY.installDismiss}
        </button>
      </div>
    </div>
  );
}
