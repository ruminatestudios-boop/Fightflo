import { FightFloApp } from "@/components/FightFloApp";

export const metadata = {
  title: "fightflo — Reactive Fight Training",
  description:
    "Shadowboxing that fights back. Randomized reaction signals for Muay Thai, boxing, MMA and kickboxing.",
};

/** Legacy shadowboxing trainer — main product is now at / */
export default function ShadowTrainingPage() {
  return <FightFloApp />;
}
