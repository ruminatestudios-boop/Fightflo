import { Suspense } from "react";
import { BagDrillApp } from "@/components/bag-drill/BagDrillApp";
import { BAG_COPY } from "@/lib/bag-drill/copy";

export const metadata = {
  title: BAG_COPY.pageTitle,
  description: BAG_COPY.pageDescription,
};

export default function Home() {
  return (
    <div className="fixed inset-0 h-dvh w-full overflow-hidden bg-black">
      <Suspense fallback={null}>
        <BagDrillApp />
      </Suspense>
    </div>
  );
}
