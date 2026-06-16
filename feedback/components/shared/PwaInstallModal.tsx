"use client";

import { usePwaInstall } from "@/hooks/usePwaInstall";
import { PWA_INSTALL_COPY } from "@/lib/copy";
import { ModalShell } from "@/components/shared/ModalShell";

export function PwaInstallModal() {
  const { visible, installing, mode, install, dismiss } = usePwaInstall();

  return (
    <ModalShell
      open={visible}
      onClose={dismiss}
      title={PWA_INSTALL_COPY.title}
      titleId="pwa-install-title"
      showClose={false}
      zIndex={210}
      footer={
        <div className="pwa-install-actions">
          <button
            type="button"
            className="ff-primary-btn pwa-install-cta"
            disabled={installing}
            onClick={() => void install()}
          >
            {installing
              ? PWA_INSTALL_COPY.installingLabel
              : mode === "ios"
                ? PWA_INSTALL_COPY.iosCta
                : PWA_INSTALL_COPY.cta}
          </button>
          <button type="button" className="pwa-install-dismiss" onClick={dismiss}>
            {PWA_INSTALL_COPY.dismiss}
          </button>
        </div>
      }
    >
      <p className="pwa-install-body">
        {mode === "ios" ? PWA_INSTALL_COPY.iosBody : PWA_INSTALL_COPY.body}
      </p>
      {mode === "ios" ? (
        <ol className="pwa-install-steps">
          {PWA_INSTALL_COPY.iosSteps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      ) : null}
    </ModalShell>
  );
}
