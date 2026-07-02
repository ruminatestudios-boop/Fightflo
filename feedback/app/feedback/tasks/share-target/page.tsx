import { PasscodeGate } from "@/components/tasks/PasscodeGate";
import { ShareTargetHandler } from "@/components/tasks/ShareTargetHandler";

// Mirrors /tasks/share-target at a URL that falls within this app's existing
// manifest `scope` ("/feedback/"), which the Web Share Target spec requires
// the share_target `action` to be inside of for the browser to honor it.
export default function FeedbackShareTargetPage() {
  return (
    <PasscodeGate>
      <ShareTargetHandler />
    </PasscodeGate>
  );
}
