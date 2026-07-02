import type { Metadata } from "next";
import { ManifestSwap } from "@/components/tasks/ManifestSwap";
import { PasscodeGate } from "@/components/tasks/PasscodeGate";

// Overrides the root layout's icons so Tasks installs to the home screen
// with its own waveform icon instead of Fightflo's. (The manifest link
// itself can't be overridden this way — see ManifestSwap.)
export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Tasks",
    icons: {
      icon: "/tasks-icons/icon-192.png",
      apple: "/tasks-icons/apple-touch-icon.png",
    },
    appleWebApp: {
      capable: true,
      statusBarStyle: "black-translucent",
      title: "Tasks",
    },
  };
}

export default function TasksLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ManifestSwap />
      <PasscodeGate>{children}</PasscodeGate>
    </>
  );
}
