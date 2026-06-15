"use client";

import { usePwaInstall } from "@/hooks/usePwaInstall";
import { PWA_INSTALL_COPY } from "@/lib/copy";

export function PwaInstallModal() {
  const { visible, installing, mode, install, dismiss } = usePwaInstall();

  if (!visible) return null;

  return (
    <div className="pwa-install-modal" role="dialog" aria-labelledby="pwa-install-title">
      <button
        type="button"
        className="netflix-modal-backdrop"
        aria-label="Dismiss install prompt"
        onClick={dismiss}
      />
      <div className="netflix-modal-sheet pwa-install-sheet">
        <div className="pwa-install-handle" aria-hidden />
        <p id="pwa-install-title" className="pwa-install-title">
          {PWA_INSTALL_COPY.title}
        </p>
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
      </div>
    </div>
  );
}
