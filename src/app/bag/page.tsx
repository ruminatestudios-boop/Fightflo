import { Suspense } from "react";
import { BagDrillApp } from "@/components/bag-drill/BagDrillApp";

export const metadata = {
  title: "FightFlo Bag Drill — Train Smarter. Fight Faster.",
  description:
    "AI-powered punching bag trainer. Camera and mic detect punches, call combos, track reaction speed and weaknesses.",
};

export default function BagDrillPage() {
  return (
    <div className="fixed inset-0 h-dvh w-full overflow-hidden bg-black">
      <Suspense fallback={null}>
        <BagDrillApp />
      </Suspense>
    </div>
  );
}
