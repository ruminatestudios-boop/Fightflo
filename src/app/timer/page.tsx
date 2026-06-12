import { BoxingTimerApp } from "@/components/timer/BoxingTimerApp";

export const metadata = {
  title: "Free Boxing Round Timer — FightFlo",
  description:
    "Smart boxing timer with championship phases, corner coaching, and combo callouts. Better than a standard round clock.",
};

export default function TimerPage() {
  return (
    <div className="fixed inset-0 h-dvh w-full overflow-hidden bg-black">
      <BoxingTimerApp />
    </div>
  );
}
