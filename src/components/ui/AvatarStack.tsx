"use client";

import Image from "next/image";

interface AvatarStackProps {
  images: readonly string[];
  totalCount: number;
  label: string;
  className?: string;
}

function overflowLabel(totalCount: number, visible: number): string {
  const extra = Math.max(0, totalCount - visible);
  if (extra >= 100) return "100+";
  if (extra > 0) return `${extra}+`;
  return "";
}

export function AvatarStack({
  images,
  totalCount,
  label,
  className = "",
}: AvatarStackProps) {
  const overflow = overflowLabel(totalCount, images.length);

  return (
    <div className={`flex flex-col items-center gap-2.5 ${className}`}>
      <div className="flex items-center justify-center">
        {images.map((src, index) => (
          <div
            key={src}
            className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full border-2 border-black bg-[#1a1a1a]"
            style={{ marginLeft: index === 0 ? 0 : -12, zIndex: images.length - index }}
          >
            <Image
              src={src}
              alt=""
              fill
              sizes="44px"
              className="object-cover object-[center_20%]"
            />
          </div>
        ))}
        {overflow && (
          <div
            className="relative z-0 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-black bg-[#2a2a2a] text-[11px] font-medium text-white/55"
            style={{ marginLeft: -12 }}
          >
            {overflow}
          </div>
        )}
      </div>
      <p className="text-center text-sm text-white/80">{label}</p>
    </div>
  );
}
