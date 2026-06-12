"use client";

interface ScreenHeaderProps {
  eyebrow?: string;
  title: string;
}

export function ScreenHeader({ eyebrow, title }: ScreenHeaderProps) {
  return (
    <header>
      {eyebrow && <p className="label text-[#525252]">{eyebrow}</p>}
      <h1 className="font-display mt-2 text-[2.15rem] leading-[0.95] tracking-wide text-white">
        {title}
      </h1>
    </header>
  );
}
