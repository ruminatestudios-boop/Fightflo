import { TransportButton } from "./TransportButton";
import { MicIcon } from "./icons";

export function FloatingRecordButton({ onClick }: { onClick: () => void }) {
  return (
    <TransportButton
      variant="active"
      size="lg"
      onClick={onClick}
      aria-label="Add task by voice"
      className="fixed bottom-6 right-6 shadow-lg"
    >
      <MicIcon className="h-8 w-8" />
    </TransportButton>
  );
}
