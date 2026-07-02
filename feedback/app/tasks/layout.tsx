import { PasscodeGate } from "@/components/tasks/PasscodeGate";

export default function TasksLayout({ children }: { children: React.ReactNode }) {
  return <PasscodeGate>{children}</PasscodeGate>;
}
