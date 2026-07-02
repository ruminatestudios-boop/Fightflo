import { TransportButton } from "./TransportButton";
import { MicIcon } from "./icons";

export function RecordButton({
  recording,
  onClick,
}: {
  recording: boolean;
  onClick: () => void;
}) {
  return (
    <TransportButton
      variant="active"
      size="lg"
      onClick={onClick}
      aria-label={recording ? "Stop recording" : "Start recording"}
      className={recording ? "animate-[tasks-pulse-ring_1.4s_ease-out_infinite]" : ""}
    >
      <MicIcon className="h-8 w-8" />
    </TransportButton>
  );
}
