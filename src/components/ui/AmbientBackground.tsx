"use client";

export function AmbientBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden bg-[#111111]">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(255,255,255,0.04),transparent)]" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#161616] via-[#111111] to-[#0d0d0d]" />
    </div>
  );
}
