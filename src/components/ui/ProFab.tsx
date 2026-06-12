"use client";

interface ProFabProps {
  onClick: () => void;
  hidden?: boolean;
}

/** Always-visible Pro entry when not subscribed */
export function ProFab({ onClick, hidden = false }: ProFabProps) {
  if (hidden) return null;

  return (
    <button
      type="button"
      onClick={onClick}
      className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-4 z-[90] flex items-center gap-2 rounded-full border border-[#fa4141]/50 bg-[#fa4141] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_8px_32px_rgba(250,65,65,0.45)] transition-transform active:scale-95"
    >
      <span>⚡</span>
      <span>Pro</span>
    </button>
  );
}
