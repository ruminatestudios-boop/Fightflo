"use client";

interface ToggleProps {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}

export function Toggle({ label, checked, onChange }: ToggleProps) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between border-b border-white/[0.06] py-4 last:border-0"
    >
      <span className="text-sm text-[#a3a3a3]">{label}</span>
      <div
        className={`relative h-7 w-[52px] rounded-full transition-colors duration-200 ${
          checked ? "bg-white" : "bg-[#2a2a2a]"
        }`}
      >
        <div
          className={`absolute top-0.5 h-6 w-6 rounded-full transition-transform duration-200 ${
            checked
              ? "translate-x-[22px] bg-black"
              : "translate-x-0.5 bg-[#525252]"
          }`}
        />
      </div>
    </button>
  );
}
